import 'package:flutter/material.dart';

import 'app_scope.dart';
import 'screens/home_screen.dart';
import 'services/auth_service.dart';
import 'services/spaces_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final auth = AuthService();
  await auth.init();
  runApp(MyApp(auth: auth, spaces: SpacesService(auth.api)));
}

class MyApp extends StatelessWidget {
  final AuthService auth;
  final SpacesService spaces;
  const MyApp({super.key, required this.auth, required this.spaces});

  @override
  Widget build(BuildContext context) {
    return AppScope(
      auth: auth,
      spaces: spaces,
      child: MaterialApp(
        title: 'Coworking',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
          useMaterial3: true,
        ),
        home: HomeScreen(auth: auth),
      ),
    );
  }
}
