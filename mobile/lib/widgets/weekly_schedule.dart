import 'package:flutter/material.dart';

import '../models/space.dart';

/// Editor dos 7 dias da semana (liga/desliga cada dia e define início e término).
/// [name] é o prefixo das chaves de erro (ex.: "opening_hours" -> "opening_hours.2.to").
class WeeklySchedule extends StatelessWidget {
  final String name;
  final List<DaySchedule> value;
  final ValueChanged<List<DaySchedule>> onChanged;
  final Map<String, String> errors;
  final String offLabel;
  final List<Widget> actions;

  const WeeklySchedule({
    super.key,
    required this.name,
    required this.value,
    required this.onChanged,
    required this.errors,
    required this.offLabel,
    this.actions = const [],
  });

  void _update(int day, DaySchedule Function(DaySchedule) change) =>
      onChanged([for (final d in value) d.day == day ? change(d) : d]);

  // Copia o horário do primeiro dia marcado para todos os outros dias marcados
  void _applyFirstToAll() {
    final first = value.where((d) => d.enabled).firstOrNull;
    if (first == null) return;
    onChanged([for (final d in value) d.enabled ? d.copyWith(from: first.from, to: first.to) : d]);
  }

  Future<void> _pickTime(BuildContext context, String current, ValueChanged<String> set) async {
    final parts = current.split(':');
    final initial = TimeOfDay(
      hour: int.tryParse(parts.first) ?? 8,
      minute: parts.length > 1 ? int.tryParse(parts[1]) ?? 0 : 0,
    );
    final picked = await showTimePicker(
      context: context,
      initialTime: initial,
      builder: (ctx, child) => MediaQuery(
        data: MediaQuery.of(ctx).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (picked == null) return;
    set('${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurfaceVariant;
    final generalError = errors[name];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(spacing: 8, children: [
          TextButton(
            onPressed: value.any((d) => d.enabled) ? _applyFirstToAll : null,
            child: const Text('Repetir o primeiro horário nos outros dias'),
          ),
          ...actions,
        ]),
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: theme.colorScheme.outlineVariant),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(children: [
            for (var w = 0; w < weekdays.length; w++) ...[
              if (w > 0) Divider(height: 1, color: theme.colorScheme.outlineVariant),
              Builder(builder: (context) {
                final day = weekdays[w];
                final index = value.indexWhere((d) => d.day == day.day);
                if (index < 0) return const SizedBox();
                final entry = value[index];
                final error = errors['$name.$index.from'] ?? errors['$name.$index.to'];

                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [
                      Switch(
                        value: entry.enabled,
                        onChanged: (v) => _update(day.day, (d) => d.copyWith(enabled: v)),
                      ),
                      Expanded(
                        child: Text(
                          day.label,
                          style: TextStyle(
                            fontWeight: entry.enabled ? FontWeight.w600 : null,
                            color: entry.enabled ? null : muted,
                          ),
                        ),
                      ),
                      if (!entry.enabled) Text(offLabel, style: TextStyle(color: muted)),
                    ]),
                    if (entry.enabled)
                      Padding(
                        padding: const EdgeInsets.only(left: 60, bottom: 6),
                        child: Row(children: [
                          OutlinedButton(
                            onPressed: () => _pickTime(context, entry.from,
                                (t) => _update(day.day, (d) => d.copyWith(from: t))),
                            child: Text(entry.from),
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 8),
                            child: Text('às'),
                          ),
                          OutlinedButton(
                            onPressed: () => _pickTime(context, entry.to,
                                (t) => _update(day.day, (d) => d.copyWith(to: t))),
                            child: Text(entry.to),
                          ),
                        ]),
                      ),
                    if (error != null)
                      Padding(
                        padding: const EdgeInsets.only(left: 12, bottom: 6),
                        child: Text(error,
                            style: TextStyle(color: theme.colorScheme.error, fontSize: 13)),
                      ),
                  ]),
                );
              }),
            ],
          ]),
        ),
        if (generalError != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(generalError, style: TextStyle(color: theme.colorScheme.error)),
          ),
      ],
    );
  }
}
