import 'package:flutter/material.dart';

import '../models/space.dart';

class AmenityPicker extends StatelessWidget {
  final List<String> value;
  final ValueChanged<List<String>> onChanged;
  final String? error;
  const AmenityPicker({super.key, required this.value, required this.onChanged, this.error});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(spacing: 8, runSpacing: 4, children: [
          for (final e in amenities.entries)
            FilterChip(
              label: Text(e.value),
              selected: value.contains(e.key),
              onSelected: (on) => onChanged(
                on ? [...value, e.key] : [for (final a in value) if (a != e.key) a],
              ),
            ),
        ]),
        if (error != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ),
      ],
    );
  }
}
