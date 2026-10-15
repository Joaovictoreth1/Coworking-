import 'dart:async';

import 'package:flutter/material.dart';

import '../app_scope.dart';
import '../favorites.dart';
import '../models/space.dart';
import '../services/auth_service.dart';
import '../services/spaces_service.dart';
import '../widgets/common.dart';
import '../widgets/space_card.dart';
import 'admin/spaces_list_screen.dart';
import 'favorites_screen.dart';
import 'login_screen.dart';
import 'register_screen.dart';
import 'space_detail_screen.dart';

/// Vitrine pública: busca, filtros de preço, ordenação e lista de locais.
class HomeScreen extends StatefulWidget {
  final AuthService auth;
  const HomeScreen({super.key, required this.auth});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _scroll = ScrollController();
  final _searchCtrl = TextEditingController();
  Timer? _debounce;

  List<Space> _items = [];
  PageMeta? _meta;
  bool _loading = true;
  bool _loadingMore = false;
  String _error = '';
  String _favoriteError = '';
  SpaceFilters _filters = const SpaceFilters();
  int _requestId = 0; // descarta respostas de buscas antigas
  int? _userId;

  AuthService get _auth => widget.auth;

  @override
  void initState() {
    super.initState();
    _userId = _auth.user?.id;
    _auth.addListener(_onAuthChanged);
    _scroll.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _auth.removeListener(_onAuthChanged);
    _debounce?.cancel();
    _scroll.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  // Entrou/saiu da conta: recarrega, porque os favoritos mudam.
  void _onAuthChanged() {
    if (_auth.user?.id != _userId) {
      _userId = _auth.user?.id;
      _load();
    }
  }

  void _onScroll() {
    if (_scroll.position.pixels > _scroll.position.maxScrollExtent - 400) _loadMore();
  }

  Future<void> _load() async {
    final id = ++_requestId;
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final res = await AppScope.of(context).spaces.listPublic(_filters);
      if (!mounted || id != _requestId) return;
      setState(() {
        _items = res.data;
        _meta = res.meta;
      });
    } on ApiException catch (e) {
      if (!mounted || id != _requestId) return;
      setState(() => _error = e.message);
    } finally {
      if (mounted && id == _requestId) setState(() => _loading = false);
    }
  }

  Future<void> _loadMore() async {
    final meta = _meta;
    if (_loading || _loadingMore || meta == null || !meta.hasMore) return;
    final id = _requestId;
    setState(() => _loadingMore = true);
    try {
      final res = await AppScope.of(context)
          .spaces
          .listPublic(_filters, page: meta.currentPage + 1);
      if (!mounted || id != _requestId) return;
      setState(() {
        final known = _items.map((s) => s.id).toSet();
        _items = [..._items, ...res.data.where((s) => !known.contains(s.id))];
        _meta = res.meta;
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  void _setFilters(SpaceFilters next, {bool debounce = false}) {
    setState(() => _filters = next);
    _debounce?.cancel();
    if (debounce) {
      _debounce = Timer(const Duration(milliseconds: 350), _load);
    } else {
      _load();
    }
  }

  void _applyFavorite(int id, bool favorite) {
    setState(() {
      _items = [for (final s in _items) s.id == id ? s.copyWith(isFavorite: favorite) : s];
    });
  }

  Future<void> _toggleFavorite(Space space) async {
    setState(() => _favoriteError = '');
    final error = await toggleFavorite(context, space, _applyFavorite);
    if (mounted && error != null) setState(() => _favoriteError = error);
  }

  Future<void> _openDetail(Space space) async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => SpaceDetailScreen(id: space.id)),
    );
    // Volta da tela de detalhe: favorito e nota podem ter mudado.
    if (mounted) _load();
  }

  Future<void> _openFilters() async {
    final result = await showModalBottomSheet<SpaceFilters>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _FiltersSheet(initial: _filters),
    );
    if (result != null) _setFilters(result);
  }

  void _push(Widget screen) =>
      Navigator.of(context).push(MaterialPageRoute(builder: (_) => screen));

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _auth,
      builder: (context, _) {
        final user = _auth.user;
        return Scaffold(
          appBar: AppBar(
            title: const Text('Encontre o espaço ideal'),
            actions: [
              if (user == null) ...[
                TextButton(onPressed: () => _push(LoginScreen(auth: _auth)), child: const Text('Entrar')),
              ] else
                PopupMenuButton<String>(
                  tooltip: 'Menu',
                  icon: const Icon(Icons.account_circle_outlined),
                  onSelected: (v) {
                    switch (v) {
                      case 'favorites':
                        _push(const FavoritesScreen());
                      case 'spaces':
                        _push(const SpacesListScreen());
                      case 'logout':
                        _auth.logout();
                    }
                  },
                  itemBuilder: (_) => [
                    PopupMenuItem(
                      enabled: false,
                      child: Text('Olá, ${user.name.split(' ').first}'),
                    ),
                    const PopupMenuItem(value: 'favorites', child: Text('Meus favoritos')),
                    PopupMenuItem(
                      value: 'spaces',
                      child: Text(user.isAdmin ? 'Gerenciar locais' : 'Meus locais'),
                    ),
                    const PopupMenuDivider(),
                    const PopupMenuItem(value: 'logout', child: Text('Sair')),
                  ],
                ),
            ],
          ),
          body: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: TextField(
                  controller: _searchCtrl,
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: 'Buscar por nome, bairro ou cidade',
                    prefixIcon: const Icon(Icons.search),
                    border: const OutlineInputBorder(),
                    isDense: true,
                    suffixIcon: _searchCtrl.text.isEmpty
                        ? null
                        : IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchCtrl.clear();
                              _setFilters(_filters.copyWith(q: ''));
                            },
                          ),
                  ),
                  onChanged: (v) => _setFilters(_filters.copyWith(q: v.trim()), debounce: true),
                ),
              ),
              _FilterBar(
                filters: _filters,
                onType: (v) => _setFilters(_filters.copyWith(priceType: v)),
                onOpenSheet: _openFilters,
              ),
              Expanded(child: _buildBody(user)),
            ],
          ),
        );
      },
    );
  }

  Widget _buildBody(AuthUser? user) {
    final filtersOn = _filters.hasPriceFilter || _filters.q.isNotEmpty;

    if (_error.isNotEmpty && _items.isEmpty) {
      return ListView(children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(children: [
            InfoBanner(_error),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: _load, child: const Text('Tentar de novo')),
          ]),
        ),
      ]);
    }

    if (_loading && _items.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: _items.isEmpty
          ? ListView(children: [
              EmptyState(
                title: filtersOn ? 'Nenhum local encontrado' : 'Ainda não há locais disponíveis',
                message: filtersOn
                    ? 'Tente outro termo ou ajuste a faixa de preço.'
                    : 'Volte em breve.',
                action: _filters.hasPriceFilter
                    ? OutlinedButton(
                        onPressed: () => _setFilters(
                            SpaceFilters(q: _filters.q, sort: _filters.sort)),
                        child: const Text('Limpar filtros'),
                      )
                    : null,
              ),
            ])
          : ListView.separated(
              controller: _scroll,
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
              itemCount: _items.length + 2,
              separatorBuilder: (_, __) => const SizedBox(height: 14),
              itemBuilder: (context, i) {
                if (i == 0) {
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (_favoriteError.isNotEmpty) ...[
                        InfoBanner(_favoriteError,
                            onClose: () => setState(() => _favoriteError = '')),
                        const SizedBox(height: 8),
                      ],
                      if (_error.isNotEmpty) ...[
                        InfoBanner(_error, onClose: () => setState(() => _error = '')),
                        const SizedBox(height: 8),
                      ],
                      if (_meta != null)
                        Text(
                          '${_meta!.total} ${_meta!.total == 1 ? 'local' : 'locais'}'
                          '${filtersOn ? ' encontrados' : ' disponíveis'}',
                          style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                        ),
                    ],
                  );
                }
                if (i == _items.length + 1) return ListFooter(loading: _loadingMore);
                final space = _items[i - 1];
                return SpaceCard(
                  space: space,
                  onTap: () => _openDetail(space),
                  onToggleFavorite: () => _toggleFavorite(space),
                );
              },
            ),
    );
  }
}

class _FilterBar extends StatelessWidget {
  final SpaceFilters filters;
  final ValueChanged<String> onType;
  final VoidCallback onOpenSheet;
  const _FilterBar({required this.filters, required this.onType, required this.onOpenSheet});

  @override
  Widget build(BuildContext context) {
    final hasRange = filters.minPrice.isNotEmpty || filters.maxPrice.isNotEmpty;
    final customSort = filters.sort != 'recent';
    return SizedBox(
      height: 52,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        children: [
          ActionChip(
            avatar: const Icon(Icons.tune, size: 18),
            label: Text(hasRange || customSort ? 'Filtros •' : 'Filtros'),
            onPressed: onOpenSheet,
          ),
          for (final t in priceTypes) ...[
            const SizedBox(width: 8),
            ChoiceChip(
              label: Text(t.label),
              selected: filters.priceType == t.value,
              onSelected: (_) => onType(t.value),
            ),
          ],
        ],
      ),
    );
  }
}

/// Faixa de preço e ordenação.
class _FiltersSheet extends StatefulWidget {
  final SpaceFilters initial;
  const _FiltersSheet({required this.initial});

  @override
  State<_FiltersSheet> createState() => _FiltersSheetState();
}

class _FiltersSheetState extends State<_FiltersSheet> {
  late final _min = TextEditingController(text: widget.initial.minPrice);
  late final _max = TextEditingController(text: widget.initial.maxPrice);
  late String _sort = widget.initial.sort;

  @override
  void dispose() {
    _min.dispose();
    _max.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isFree = widget.initial.priceType == 'free';
    final unit = priceTypes.firstWhere((t) => t.value == widget.initial.priceType).unit;

    Widget priceField(String label, TextEditingController c) => Expanded(
          child: TextField(
            controller: c,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(
              labelText: '$label${unit.isNotEmpty ? ' ($unit)' : ''}',
              prefixText: 'R\$ ',
              hintText: '0,00',
              border: const OutlineInputBorder(),
            ),
          ),
        );

    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Filtros', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            if (isFree)
              const Text('Mostrando apenas espaços de entrada livre.')
            else
              Row(children: [
                priceField('Preço mínimo', _min),
                const SizedBox(width: 12),
                priceField('Preço máximo', _max),
              ]),
            const SizedBox(height: 20),
            Text('Ordenar por', style: Theme.of(context).textTheme.titleSmall),
            RadioGroup<String>(
              groupValue: _sort,
              onChanged: (v) => setState(() => _sort = v ?? _sort),
              child: Column(children: [
                for (final e in sortOptions.entries)
                  RadioListTile<String>(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: Text(e.value),
                    value: e.key,
                  ),
              ]),
            ),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.pop(
                    context,
                    SpaceFilters(q: widget.initial.q, sort: _sort),
                  ),
                  child: const Text('Limpar'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton(
                  onPressed: () => Navigator.pop(
                    context,
                    widget.initial.copyWith(
                      minPrice: isFree ? '' : _min.text.trim(),
                      maxPrice: isFree ? '' : _max.text.trim(),
                      sort: _sort,
                    ),
                  ),
                  child: const Text('Aplicar'),
                ),
              ),
            ]),
          ],
        ),
      ),
    );
  }
}
