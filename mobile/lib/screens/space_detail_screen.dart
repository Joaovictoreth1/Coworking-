import 'package:flutter/material.dart';

import '../app_scope.dart';
import '../favorites.dart';
import '../models/space.dart';
import '../services/auth_service.dart';
import '../widgets/common.dart';
import '../widgets/favorite_button.dart';
import '../widgets/reviews_section.dart';
import '../widgets/stars.dart';

class SpaceDetailScreen extends StatefulWidget {
  final int id;
  const SpaceDetailScreen({super.key, required this.id});

  @override
  State<SpaceDetailScreen> createState() => _SpaceDetailScreenState();
}

class _SpaceDetailScreenState extends State<SpaceDetailScreen> {
  final _reviewsKey = GlobalKey();
  Space? _space;
  bool _loading = true;
  String _error = '';
  String _favoriteError = '';
  int _photoIndex = 0;
  final _pageCtrl = PageController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _pageCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final space = await AppScope.of(context).spaces.getPublic(widget.id);
      if (mounted) setState(() => _space = space);
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _error =
            e.status == 404 ? 'Local não encontrado ou indisponível.' : e.message);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _applyFavorite(int _, bool favorite) {
    setState(() => _space = _space?.copyWith(isFavorite: favorite));
  }

  Future<void> _toggleFavorite() async {
    final space = _space;
    if (space == null) return;
    setState(() => _favoriteError = '');
    final error = await toggleFavorite(context, space, _applyFavorite);
    if (mounted && error != null) setState(() => _favoriteError = error);
  }

  // Mantém a nota do cabeçalho em sincronia quando a pessoa avalia ou apaga a avaliação.
  void _onSummaryChanged(ReviewSummary summary) {
    final space = _space;
    if (space == null) return;
    if (space.reviewsCount == summary.count && space.ratingAvg == summary.average) return;
    setState(() {
      _space = space.copyWith(
        ratingAvg: summary.average,
        clearRating: summary.average == null,
        reviewsCount: summary.count,
      );
    });
  }

  void _goToPhoto(int i) {
    setState(() => _photoIndex = i);
    _pageCtrl.animateToPage(i,
        duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
  }

  @override
  Widget build(BuildContext context) {
    final space = _space;
    return Scaffold(
      appBar: AppBar(
        title: Text(space?.name ?? 'Local', overflow: TextOverflow.ellipsis),
        actions: [
          if (space != null)
            FavoriteButton(active: space.isFavorite, onToggle: _toggleFavorite),
        ],
      ),
      body: _loading && space == null
          ? const Center(child: CircularProgressIndicator())
          : _error.isNotEmpty && space == null
              ? ListView(padding: const EdgeInsets.all(16), children: [
                  InfoBanner(_error),
                  const SizedBox(height: 12),
                  OutlinedButton(onPressed: _load, child: const Text('Tentar de novo')),
                ])
              : space == null
                  ? const SizedBox()
                  : _buildContent(space),
    );
  }

  Widget _buildContent(Space space) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurfaceVariant;
    final photos = space.photos;

    return ListView(
      padding: const EdgeInsets.only(bottom: 32),
      children: [
        // Galeria
        AspectRatio(
          aspectRatio: 16 / 10,
          child: photos.isEmpty
              ? const NetImage(null)
              : PageView.builder(
                  controller: _pageCtrl,
                  itemCount: photos.length,
                  onPageChanged: (i) => setState(() => _photoIndex = i),
                  itemBuilder: (_, i) => NetImage(photos[i].url),
                ),
        ),
        if (photos.length > 1)
          SizedBox(
            height: 64,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: photos.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) => GestureDetector(
                onTap: () => _goToPhoto(i),
                child: Container(
                  width: 72,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      width: 2,
                      color: i == _photoIndex ? theme.colorScheme.primary : Colors.transparent,
                    ),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: Opacity(
                        opacity: i == _photoIndex ? 1 : 0.7, child: NetImage(photos[i].url)),
                  ),
                ),
              ),
            ),
          ),

        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Cabeçalho
              Text(space.name,
                  style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Wrap(
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 12,
                runSpacing: 4,
                children: [
                  if (space.ratingAvg != null)
                    InkWell(
                      onTap: () => Scrollable.ensureVisible(
                        _reviewsKey.currentContext!,
                        duration: const Duration(milliseconds: 300),
                      ),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Stars(value: space.ratingAvg!),
                        const SizedBox(width: 6),
                        Text(formatRating(space.ratingAvg!),
                            style: const TextStyle(fontWeight: FontWeight.w600)),
                        Text(
                          ' (${space.reviewsCount} ${space.reviewsCount == 1 ? 'avaliação' : 'avaliações'})',
                          style: TextStyle(color: muted),
                        ),
                      ]),
                    )
                  else
                    Text('Sem avaliações ainda', style: TextStyle(color: muted)),
                  if (space.isFree)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text('Gratuito',
                          style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Colors.green.shade800)),
                    ),
                ],
              ),
              if (_favoriteError.isNotEmpty) ...[
                const SizedBox(height: 12),
                InfoBanner(_favoriteError, onClose: () => setState(() => _favoriteError = '')),
              ],
              const SizedBox(height: 12),
              _IconText(
                Icons.place_outlined,
                '${formatAddress(space)}'
                '${space.complement != null && space.complement!.isNotEmpty ? ' · ${space.complement}' : ''}'
                '${space.zipCode != null && space.zipCode!.isNotEmpty ? ' · CEP ${space.zipCode}' : ''}',
              ),
              if (space.capacity != null) ...[
                const SizedBox(height: 4),
                _IconText(Icons.person_outline, peopleLabel(space.capacity!)),
              ],

              // Preços
              const SizedBox(height: 20),
              _PricesCard(space: space),

              if (space.description != null && space.description!.isNotEmpty) ...[
                _SectionTitle('Sobre o local'),
                Text(space.description!),
              ],

              if (space.amenities.isNotEmpty) ...[
                _SectionTitle('Comodidades'),
                Wrap(
                  runSpacing: 10,
                  children: [
                    for (final a in space.amenities)
                      FractionallySizedBox(
                        widthFactor: 0.5,
                        child: Row(children: [
                          Icon(Icons.check, size: 20, color: theme.colorScheme.primary),
                          const SizedBox(width: 8),
                          Expanded(child: Text(amenityLabel(a))),
                        ]),
                      ),
                  ],
                ),
              ],

              _SectionTitle('Horário de funcionamento'),
              _ScheduleList(schedule: space.openingHours, offLabel: 'Fechado'),
              _SectionTitle('Disponível para locação'),
              _ScheduleList(schedule: space.availability, offLabel: 'Indisponível'),

              const SizedBox(height: 32),
              KeyedSubtree(
                key: _reviewsKey,
                child: ReviewsSection(
                  spaceId: space.id,
                  ownerId: space.ownerId,
                  onSummaryChanged: _onSummaryChanged,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 28, bottom: 12),
        child: Text(text,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600)),
      );
}

class _IconText extends StatelessWidget {
  final IconData icon;
  final String text;
  const _IconText(this.icon, this.text);

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Icon(icon, size: 18, color: muted),
      const SizedBox(width: 6),
      Expanded(child: Text(text, style: TextStyle(color: muted))),
    ]);
  }
}

class _ScheduleList extends StatelessWidget {
  final List<DaySchedule> schedule;
  final String offLabel;
  const _ScheduleList({required this.schedule, required this.offLabel});

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: Theme.of(context).colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(children: [
        for (var i = 0; i < weekdays.length; i++) ...[
          if (i > 0) Divider(height: 1, color: Theme.of(context).colorScheme.outlineVariant),
          Builder(builder: (_) {
            final w = weekdays[i];
            final entry = schedule.where((d) => d.day == w.day).firstOrNull;
            final open = entry?.enabled == true;
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(w.label, style: TextStyle(color: open ? null : muted)),
                  Text(
                    open ? '${entry!.from} às ${entry.to}' : offLabel,
                    style: TextStyle(
                      color: open ? null : muted,
                      fontWeight: open ? FontWeight.w600 : null,
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ]),
    );
  }
}

class _PricesCard extends StatelessWidget {
  final Space space;
  const _PricesCard({required this.space});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurfaceVariant;
    final offered = [
      if (space.hourlyPrice != null) 'locação por hora',
      if (space.dailyPrice != null) 'locação por dia',
      if (space.monthlyPrice != null) 'pacote mensal',
    ];

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Preços',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            if (space.isFree) ...[
              Text('Gratuito',
                  style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w600, color: Colors.green.shade800)),
              const SizedBox(height: 8),
              Text(
                'Entrada livre, sem cobrança. Confira os horários de funcionamento e as regras de uso do local.',
                style: TextStyle(color: muted),
              ),
            ] else ...[
              for (final p in priceList(space))
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(p.label, style: TextStyle(color: muted)),
                      Text(formatBRL(p.value),
                          style: theme.textTheme.titleLarge
                              ?.copyWith(fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              if (offered.isNotEmpty)
                Text(
                  '${_capitalize(joinList(offered))} disponível neste local.',
                  style: TextStyle(fontSize: 12, color: muted),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

String _capitalize(String t) => t.isEmpty ? t : t[0].toUpperCase() + t.substring(1);
