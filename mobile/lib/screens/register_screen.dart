import 'package:flutter/material.dart';

import '../services/auth_service.dart';
import 'login_screen.dart';

class RegisterScreen extends StatefulWidget {
  final AuthService auth;
  const RegisterScreen({super.key, required this.auth});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirmation = TextEditingController();
  bool _submitting = false;
  bool _obscure = true;
  String? _message;
  Map<String, String> _fieldErrors = {};

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _confirmation.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _message = null;
      _fieldErrors = {};
    });
    try {
      await widget.auth.register(
        name: _name.text.trim(),
        email: _email.text.trim(),
        password: _password.text,
        passwordConfirmation: _confirmation.text,
      );
      if (!mounted) return;
      Navigator.of(context).pop();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _fieldErrors = e.fieldErrors;
        if (e.fieldErrors.isEmpty) _message = e.message;
      });
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Criar conta')),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextFormField(
                      controller: _name,
                      textCapitalization: TextCapitalization.words,
                      autofillHints: const [AutofillHints.name],
                      decoration: InputDecoration(
                        labelText: 'Nome',
                        border: const OutlineInputBorder(),
                        errorText: _fieldErrors['name'],
                      ),
                      validator: (v) =>
                          (v == null || v.trim().isEmpty) ? 'Informe seu nome.' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      autofillHints: const [AutofillHints.email],
                      decoration: InputDecoration(
                        labelText: 'E-mail',
                        border: const OutlineInputBorder(),
                        errorText: _fieldErrors['email'],
                      ),
                      validator: (v) =>
                          (v == null || v.trim().isEmpty) ? 'Informe seu e-mail.' : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _password,
                      obscureText: _obscure,
                      autofillHints: const [AutofillHints.newPassword],
                      decoration: InputDecoration(
                        labelText: 'Senha',
                        border: const OutlineInputBorder(),
                        errorText: _fieldErrors['password'],
                        suffixIcon: IconButton(
                          icon: Icon(_obscure ? Icons.visibility : Icons.visibility_off),
                          onPressed: () => setState(() => _obscure = !_obscure),
                        ),
                      ),
                      validator: (v) => (v == null || v.length < 8)
                          ? 'A senha deve ter no mínimo 8 caracteres.'
                          : null,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _confirmation,
                      obscureText: _obscure,
                      decoration: const InputDecoration(
                        labelText: 'Confirmar senha',
                        border: OutlineInputBorder(),
                      ),
                      validator: (v) =>
                          v != _password.text ? 'A confirmação da senha não confere.' : null,
                      onFieldSubmitted: (_) => _submit(),
                    ),
                    if (_message != null) ...[
                      const SizedBox(height: 12),
                      Text(_message!,
                          style: TextStyle(color: Theme.of(context).colorScheme.error)),
                    ],
                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: _submitting ? null : _submit,
                      child: _submitting
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Cadastrar'),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: _submitting
                          ? null
                          : () => Navigator.of(context).pushReplacement(
                                MaterialPageRoute(
                                  builder: (_) => LoginScreen(auth: widget.auth),
                                ),
                              ),
                      child: const Text('Já tem conta? Entrar'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
