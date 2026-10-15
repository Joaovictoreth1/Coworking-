import 'package:flutter/material.dart';

import '../models/space.dart';
import 'common.dart';
import 'favorite_button.dart';

class SpaceCard extends StatelessWidget {
  final Space space;
  final VoidCallback onTap;
  final VoidCallback? onToggleFavorite;

  const SpaceCard({super.key, required this.space, required this.onTap, this.onToggleFavorite});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurfaceVariant;
    final shown = space.amenities.take(3).toList();
    final extra = space.amenities.length - shown.length;

    return Card(
      clipBehavior: Clip.antiAlias,
      margin: EdgeInsets.zero,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(
              aspectRatio: 4 / 3,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  NetImage(space.coverUrl),
                  if (space.isFree)
                    Positioned(
                      top: 8,
                      left: 8,
                      child: _Badge('Gratuito', Colors.green.shade50, Colors.green.shade800),
                    ),
                  if (onToggleFavorite != null)
                    Positioned(
                      top: 4,
                      right: 4,
                      child: FavoriteButton(
                        overlay: true,
                        active: space.isFavorite,
                        onToggle: onToggleFavorite!,
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(space.name,
                      style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  if (space.ratingAvg != null)
                    Row(children: [
                      const Icon(Icons.star, size: 16, color: Color(0xFFF59E0B)),
                      const SizedBox(width: 4),
                      Text(formatRating(space.ratingAvg!),
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                      Text(' (${space.reviewsCount})', style: TextStyle(color: muted)),
                    ])
                  else
                    Text('Sem avaliações', style: TextStyle(color: muted)),
                  const SizedBox(height: 4),
                  _IconLine(
                    Icons.place_outlined,
                    '${space.neighborhood != null && space.neighborhood!.isNotEmpty ? '${space.neighborhood} · ' : ''}${space.city}/${space.state}',
                  ),
                  if (space.capacity != null) ...[
                    const SizedBox(height: 2),
                    _IconLine(Icons.person_outline, peopleLabel(space.capacity!)),
                  ],
                  if (shown.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        for (final a in shown) _Chip(amenityLabel(a)),
                        if (extra > 0) _Chip('+$extra'),
                      ],
                    ),
                  ],
                  const SizedBox(height: 12),
                  if (space.isFree)
                    Text('Entrada gratuita',
                        style: TextStyle(
                            fontWeight: FontWeight.w600, color: Colors.green.shade800))
                  else
                    Wrap(
                      spacing: 12,
                      children: [
                        for (final p in priceList(space))
                          Text.rich(TextSpan(children: [
                            TextSpan(
                                text: formatBRL(p.value),
                                style: const TextStyle(fontWeight: FontWeight.w600)),
                            TextSpan(text: p.unit, style: TextStyle(color: muted)),
                          ])),
                      ],
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _IconLine extends StatelessWidget {
  final IconData icon;
  final String text;
  const _IconLine(this.icon, this.text);

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: muted),
        const SizedBox(width: 6),
        Expanded(child: Text(text, style: TextStyle(color: muted))),
      ],
    );
  }
}

class _Chip extends StatelessWidget {
  final String text;
  const _Chip(this.text);

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(text, style: const TextStyle(fontSize: 12)),
      );
}

class _Badge extends StatelessWidget {
  final String text;
  final Color bg;
  final Color fg;
  const _Badge(this.text, this.bg, this.fg);

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
        child: Text(text, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: fg)),
      );
}
