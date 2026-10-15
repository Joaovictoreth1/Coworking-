import 'package:flutter/material.dart';

import 'app_scope.dart';
import 'models/space.dart';
import 'screens/login_screen.dart';
import 'services/auth_service.dart';

/// Alterna o favorito de um local com atualização otimista.
/// [apply] troca o estado na tela; se a API falhar, desfaz e devolve a mensagem
/// de erro. Visitantes são levados ao login (devolve null).
Future<String?> toggleFavorite(
  BuildContext context,
  Space space,
  void Function(int id, bool favorite) apply,
) async {
  final scope = AppScope.of(context);
  if (!scope.auth.isLoggedIn) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => LoginScreen(auth: scope.auth)),
    );
    return null;
  }

  final next = !space.isFavorite;
  apply(space.id, next);
  try {
    if (next) {
      await scope.spaces.addFavorite(space.id);
    } else {
      await scope.spaces.removeFavorite(space.id);
    }
    return null;
  } on ApiException catch (e) {
    apply(space.id, !next);
    return e.message;
  }
}
