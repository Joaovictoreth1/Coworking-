import 'package:flutter/material.dart';

const _amber = Color(0xFFF59E0B);

/// Estrelas somente leitura (arredonda para meia estrela).
class Stars extends StatelessWidget {
  final double value;
  final double size;
  const Stars({super.key, required this.value, this.size = 16});

  @override
  Widget build(BuildContext context) {
    final rounded = (value * 2).round() / 2;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 1; i <= 5; i++)
          Icon(
            rounded >= i
                ? Icons.star
                : (rounded >= i - 0.5 ? Icons.star_half : Icons.star_border),
            size: size,
            color: _amber,
          ),
      ],
    );
  }
}

/// Seletor de nota de 1 a 5.
class StarInput extends StatelessWidget {
  final int value;
  final ValueChanged<int> onChanged;
  final bool enabled;
  const StarInput({super.key, required this.value, required this.onChanged, this.enabled = true});

  @override
  Widget build(BuildContext context) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 1; i <= 5; i++)
            IconButton(
              tooltip: '$i ${i == 1 ? 'estrela' : 'estrelas'}',
              visualDensity: VisualDensity.compact,
              onPressed: enabled ? () => onChanged(i) : null,
              icon: Icon(i <= value ? Icons.star : Icons.star_border, color: _amber, size: 34),
            ),
        ],
      );
}
