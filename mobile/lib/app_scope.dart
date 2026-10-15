import 'package:flutter/widgets.dart';

import 'services/auth_service.dart';
import 'services/spaces_service.dart';

/// Entrega os serviços do app para qualquer tela (`AppScope.of(context)`).
class AppScope extends InheritedWidget {
  final AuthService auth;
  final SpacesService spaces;

  const AppScope({super.key, required this.auth, required this.spaces, required super.child});

  static AppScope of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope não encontrado acima na árvore de widgets');
    return scope!;
  }

  @override
  bool updateShouldNotify(AppScope oldWidget) =>
      auth != oldWidget.auth || spaces != oldWidget.spaces;
}
