import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../config.dart';

class ApiException implements Exception {
  final String message;
  final int status;

  /// Primeira mensagem de erro de cada campo (chaves no formato da API,
  /// ex.: "email", "opening_hours.2.to").
  final Map<String, String> fieldErrors;

  const ApiException(this.message, {this.status = 0, this.fieldErrors = const {}});

  @override
  String toString() => message;
}

/// Cliente HTTP único do app: cuida do token, do JSON, dos timeouts e da
/// tradução dos erros da API para [ApiException].
class ApiClient {
  ApiClient({required this.tokenGetter, this.onUnauthorized});

  final String? Function() tokenGetter;

  /// Chamado quando uma requisição feita COM token volta 401 (sessão expirada).
  final void Function()? onUnauthorized;

  Future<Map<String, dynamic>> send(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
    bool auth = true,
  }) async {
    final token = auth ? tokenGetter() : null;
    final headers = <String, String>{'Accept': 'application/json'};
    if (body != null) headers['Content-Type'] = 'application/json';
    if (token != null) headers['Authorization'] = 'Bearer $token';

    final uri = _uri(path, query);
    final encoded = body != null ? jsonEncode(body) : null;

    return _run(token, () {
      switch (method) {
        case 'POST':
          return http.post(uri, headers: headers, body: encoded);
        case 'PUT':
          return http.put(uri, headers: headers, body: encoded);
        case 'DELETE':
          return http.delete(uri, headers: headers, body: encoded);
        default:
          return http.get(uri, headers: headers);
      }
    }, const Duration(seconds: 15));
  }

  /// Envia arquivos (campo `field[]`) em multipart.
  Future<Map<String, dynamic>> upload(
    String path, {
    required String field,
    required List<String> filePaths,
  }) async {
    final token = tokenGetter();
    return _run(token, () async {
      final request = http.MultipartRequest('POST', _uri(path, null))
        ..headers['Accept'] = 'application/json';
      if (token != null) request.headers['Authorization'] = 'Bearer $token';
      for (final filePath in filePaths) {
        request.files.add(await http.MultipartFile.fromPath('$field[]', filePath));
      }
      final streamed = await request.send();
      return http.Response.fromStream(streamed);
    }, const Duration(seconds: 90));
  }

  Uri _uri(String path, Map<String, String>? query) {
    final uri = Uri.parse('$apiUrl$path');
    return (query == null || query.isEmpty) ? uri : uri.replace(queryParameters: query);
  }

  Future<Map<String, dynamic>> _run(
    String? token,
    Future<http.Response> Function() call,
    Duration timeout,
  ) async {
    http.Response res;
    try {
      res = await call().timeout(timeout);
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
      if (res.statusCode == 401 && token != null) onUnauthorized?.call();

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
