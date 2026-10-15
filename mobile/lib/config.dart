/// URL base da API.
/// - Emulador Android: 10.0.2.2 aponta para o localhost do computador.
/// - Celular físico: use o IP do computador na rede (ex.: http://192.168.0.10:3001/api).
/// Para trocar sem editar o código:
///   flutter run --dart-define=API_URL=http://192.168.0.10:3001/api
const String apiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://10.0.2.2:8000/api',
);
