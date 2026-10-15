import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_client.dart';

export 'api_client.dart' show ApiException;

class AuthUser {
  final int id;
  final String name;
  final String email;
  final bool isAdmin;

  const AuthUser({
    required this.id,
    required this.name,
    required this.email,
    this.isAdmin = false,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as int,
        name: json['name'] as String,
        email: json['email'] as String,
        isAdmin: json['is_admin'] == true || json['role'] == 'admin',
      );

  Map<String, dynamic> toJson() =>
      {'id': id, 'name': name, 'email': email, 'is_admin': isAdmin};
}

class AuthService extends ChangeNotifier {
  AuthService() {
    api = ApiClient(tokenGetter: () => _token, onUnauthorized: _handleUnauthorized);
  }

  /// Cliente HTTP compartilhado com os demais serviços (já envia o token).
  late final ApiClient api;

  static const _tokenKey = 'auth_token';
  static const _userKey = 'auth_user';

  SharedPreferences? _prefs;
  String? _token;
  AuthUser? _user;

  String? get token => _token;
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
      final data = await api.send('GET', '/auth/me');
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
    final data = await api.send('POST', '/auth/login', auth: false, body: {
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
    final data = await api.send('POST', '/auth/register', auth: false, body: {
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
      await api.send('POST', '/auth/logout');
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

  /// Token recusado pelo servidor em qualquer tela: encerra a sessão local.
  void _handleUnauthorized() {
    if (_token == null) return;
    _token = null;
    _user = null;
    _prefs?.remove(_tokenKey);
    _prefs?.remove(_userKey);
    notifyListeners();
  }

  Future<void> _clearLocal() async {
    _token = null;
    _user = null;
    await _prefs?.remove(_tokenKey);
    await _prefs?.remove(_userKey);
  }
}
