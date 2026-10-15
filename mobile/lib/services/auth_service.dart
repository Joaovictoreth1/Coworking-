import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config.dart';

class AuthUser {
  final int id;
  final String name;
  final String email;

  const AuthUser({required this.id, required this.name, required this.email});

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as int,
        name: json['name'] as String,
        email: json['email'] as String,
      );

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'email': email};
}

class ApiException implements Exception {
  final String message;
  final int status;
  final Map<String, String> fieldErrors;

  const ApiException(this.message, {this.status = 0, this.fieldErrors = const {}});

  @override
  String toString() => message;
}

class AuthService extends ChangeNotifier {
  static const _tokenKey = 'auth_token';
  static const _userKey = 'auth_user';

  SharedPreferences? _prefs;
  String? _token;
  AuthUser? _user;

  AuthUser? get user => _user;
  bool get isLoggedIn => _token != null && _user != null;

  /// Restaura a sessão salva no aparelho. Funciona offline: se não der para
  /// falar com o servidor, mantém o usuário local; só desloga se o servidor
  /// disser que o token é inválido (401).
  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
    _token = _prefs!.getString(_tokenKey);

    final savedUser = _prefs!.getString(_userKey);
    if (_token != null && savedUser != null) {
      _user = AuthUser.fromJson(jsonDecode(savedUser) as Map<String, dynamic>);
      notifyListeners();
      await _refreshUser();
    } else {
      await _clearLocal();
    }
  }

  Future<void> _refreshUser() async {
    try {
      final data = await _request('GET', '/auth/me', auth: true);
      _user = AuthUser.fromJson(data['user'] as Map<String, dynamic>);
      await _prefs!.setString(_userKey, jsonEncode(_user!.toJson()));
      notifyListeners();
    } on ApiException catch (e) {
      if (e.status == 401) {
        await _clearLocal();
        notifyListeners();
      }
      // Qualquer outro erro (sem internet, servidor fora): mantém a sessão local.
    }
  }

  Future<void> login(String email, String password) async {
    final data = await _request('POST', '/auth/login', body: {
      'email': email,
      'password': password,
      'device_name': 'mobile',
    });
    await _saveSession(data);
  }

  Future<void> register({
    required String name,
    required String email,
    required String password,
    required String passwordConfirmation,
  }) async {
    final data = await _request('POST', '/auth/register', body: {
      'name': name,
      'email': email,
      'password': password,
      'password_confirmation': passwordConfirmation,
      'device_name': 'mobile',
    });
    await _saveSession(data);
  }

  Future<void> logout() async {
    try {
      await _request('POST', '/auth/logout', auth: true);
    } on ApiException {
      // Sem internet ou token já inválido: encerra localmente do mesmo jeito.
    }
    await _clearLocal();
    notifyListeners();
  }

  Future<void> _saveSession(Map<String, dynamic> data) async {
    _token = data['token'] as String;
    _user = AuthUser.fromJson(data['user'] as Map<String, dynamic>);
    await _prefs!.setString(_tokenKey, _token!);
    await _prefs!.setString(_userKey, jsonEncode(_user!.toJson()));
    notifyListeners();
  }

  Future<void> _clearLocal() async {
    _token = null;
    _user = null;
    await _prefs?.remove(_tokenKey);
    await _prefs?.remove(_userKey);
  }

  Future<Map<String, dynamic>> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool auth = false,
  }) async {
    final headers = <String, String>{'Accept': 'application/json'};
    if (body != null) headers['Content-Type'] = 'application/json';
    if (auth && _token != null) headers['Authorization'] = 'Bearer $_token';

    final uri = Uri.parse('$apiUrl$path');
    final encoded = body != null ? jsonEncode(body) : null;

    http.Response res;
    try {
      final future = method == 'POST'
          ? http.post(uri, headers: headers, body: encoded)
          : http.get(uri, headers: headers);
      res = await future.timeout(const Duration(seconds: 15));
    } on TimeoutException {
      throw const ApiException('O servidor demorou para responder.');
    } on SocketException {
      throw const ApiException('Sem conexão com o servidor.');
    } on http.ClientException {
      throw const ApiException('Sem conexão com o servidor.');
    }

    Map<String, dynamic> data = {};
    try {
      final decoded = jsonDecode(res.body);
      if (decoded is Map<String, dynamic>) data = decoded;
    } catch (_) {}

    if (res.statusCode < 200 || res.statusCode >= 300) {
      final fieldErrors = <String, String>{};
      final errors = data['errors'];
      if (errors is Map) {
        errors.forEach((key, value) {
          if (value is List && value.isNotEmpty) {
            fieldErrors[key.toString()] = value.first.toString();
          }
        });
      }
      throw ApiException(
        (data['message'] as String?) ?? 'Erro inesperado (${res.statusCode}).',
        status: res.statusCode,
        fieldErrors: fieldErrors,
      );
    }

    return data;
  }
}
