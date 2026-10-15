import 'package:flutter/material.dart';

import '../services/auth_service.dart';
import 'login_screen.dart';
import 'register_screen.dart';

/// O app funciona sem login (modo offline). Entrar é opcional e serve
/// para sincronizar os dados.
class HomeScreen extends StatelessWidget {
  final AuthService auth;
  const HomeScreen({super.key, required this.auth});

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: auth,
      builder: (context, _) {
        final user = auth.user;
        return Scaffold(
          appBar: AppBar(title: const Text('Início')),
          body: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 400),
                child: user != null
                    ? Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('Olá, ${user.name}!',
                              style: Theme.of(context).textTheme.headlineSmall),
                          const SizedBox(height: 8),
                          Text(user.email),
                          const SizedBox(height: 24),
                          FilledButton(
                            onPressed: auth.logout,
                            child: const Text('Sair'),
                          ),
                        ],
                      )
                    : Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text('Você não está logado',
                              textAlign: TextAlign.center,
                              style: Theme.of(context).textTheme.headlineSmall),
                          const SizedBox(height: 8),
                          const Text(
                            'Entre para sincronizar seus dados.',
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 24),
                          FilledButton(
                            onPressed: () => Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => LoginScreen(auth: auth),
                              ),
                            ),
                            child: const Text('Entrar'),
                          ),
                          const SizedBox(height: 12),
                          OutlinedButton(
                            onPressed: () => Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => RegisterScreen(auth: auth),
                              ),
                            ),
                            child: const Text('Criar conta'),
                          ),
                        ],
                      ),
              ),
            ),
          ),
        );
      },
    );
  }
}
