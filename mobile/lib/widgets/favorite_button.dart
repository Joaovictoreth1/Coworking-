import 'package:flutter/material.dart';

class FavoriteButton extends StatelessWidget {
  final bool active;
  final VoidCallback onToggle;

  /// true: botão redondo sobre fotos (cards); false: ícone simples (AppBar).
  final bool overlay;
  const FavoriteButton({
    super.key,
    required this.active,
    required this.onToggle,
    this.overlay = false,
  });

  @override
  Widget build(BuildContext context) {
    final icon = Icon(
      active ? Icons.favorite : Icons.favorite_border,
      color: active ? Colors.red.shade600 : null,
    );
    final tooltip = active ? 'Remover dos favoritos' : 'Salvar nos favoritos';
    if (!overlay) {
      return IconButton(tooltip: tooltip, onPressed: onToggle, icon: icon);
    }
    return Material(
      color: Colors.white.withValues(alpha: 0.92),
      shape: const CircleBorder(),
      child: IconButton(
        tooltip: tooltip,
        onPressed: onToggle,
        icon: icon,
        color: Colors.black87,
      ),
    );
  }
}
