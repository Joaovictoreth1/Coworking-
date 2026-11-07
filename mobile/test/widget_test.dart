import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:coworking/models/space.dart';
import 'package:coworking/services/auth_service.dart';
import 'package:coworking/widgets/common.dart';

void main() {
  group('AuthUser model tests', () {
    test('AuthUser parses JSON correctly with role=admin', () {
      final json = {
        'id': 1,
        'name': 'Administrador',
        'email': 'admin@teste.com',
        'role': 'admin',
        'is_admin': true,
      };

      final user = AuthUser.fromJson(json);

      expect(user.id, 1);
      expect(user.name, 'Administrador');
      expect(user.email, 'admin@teste.com');
      expect(user.isAdmin, isTrue);
    });

    test('AuthUser parses standard user correctly', () {
      final json = {
        'id': 2,
        'name': 'Ana Silva',
        'email': 'ana@teste.com',
        'role': 'user',
        'is_admin': false,
      };

      final user = AuthUser.fromJson(json);

      expect(user.id, 2);
      expect(user.isAdmin, isFalse);
    });
  });

  group('DaySchedule and Space model tests', () {
    test('DaySchedule parses and converts back to JSON', () {
      final json = {
        'day': 1,
        'enabled': true,
        'from': '09:00',
        'to': '18:00',
      };

      final schedule = DaySchedule.fromJson(json);

      expect(schedule.day, 1);
      expect(schedule.enabled, isTrue);
      expect(schedule.from, '09:00');
      expect(schedule.to, '18:00');
      expect(schedule.toJson(), json);
    });

    test('Space parses JSON response correctly', () {
      final json = {
        'id': 10,
        'name': 'Coworking Paulista',
        'description': 'Espaço central com ótima vista',
        'capacity': 20,
        'zip_code': '01310-200',
        'street': 'Av Paulista',
        'number': '1000',
        'city': 'São Paulo',
        'state': 'SP',
        'hourly_price': 35.5,
        'daily_price': 150.0,
        'monthly_price': 1200.0,
        'is_free': false,
        'rating_avg': 4.8,
        'reviews_count': 12,
        'is_favorite': true,
        'owner_id': 1,
        'opening_hours': [
          {'day': 1, 'enabled': true, 'from': '08:00', 'to': '18:00'}
        ],
        'availability': [],
        'amenities': ['wifi', 'coffee'],
        'is_active': true,
        'photos': [
          {'id': 101, 'url': 'http://localhost:8000/api/photos/101'}
        ],
        'cover_url': 'http://localhost:8000/api/photos/101',
      };

      final space = Space.fromJson(json);

      expect(space.id, 10);
      expect(space.name, 'Coworking Paulista');
      expect(space.capacity, 20);
      expect(space.hourlyPrice, 35.5);
      expect(space.isFavorite, isTrue);
      expect(space.photos.length, 1);
      expect(space.photos.first.url, 'http://localhost:8000/api/photos/101');
    });
  });

  group('Widget unit tests', () {
    testWidgets('InfoBanner displays text and icon properly', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: InfoBanner('Erro de conexão com o servidor', error: true),
          ),
        ),
      );

      expect(find.text('Erro de conexão com o servidor'), findsOneWidget);
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
    });
  });
}
