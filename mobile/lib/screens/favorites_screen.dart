import 'package:flutter/material.dart';

import '../app_scope.dart';
import '../favorites.dart';
import '../models/space.dart';
import '../services/auth_service.dart';
import '../widgets/common.dart';
import '../widgets/space_card.dart';
import 'space_detail_screen.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  final _scroll = ScrollController();
  List<Space> _items = [];
  PageMeta? _meta;
  bool _loading = true;
  bool _loadingMore = false;
  String _error = '';
  String _favoriteError = '';

  @override
  void initState() {
    super.initState();
    _scroll.addListener(() {
      if (_scroll.position.pixels > _scroll.position.maxScrollExtent - 400) _loadMore();
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final res = await AppScope.of(context).spaces.listFavorites();
      if (!mounted) return;
      setState(() {
        _items = res.data;
        _meta = res.meta;
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadMore() async {
    final meta = _meta;
    if (_loading || _loadingMore || meta == null || !meta.hasMore) return;
    setState(() => _loadingMore = true);
    try {
      final res =
          await AppScope.of(context).spaces.listFavorites(page: meta.currentPage + 1);
      if (!mounted) return;
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

  // Ao desfavoritar, o card some na hora; se a API falhar, volta.
  void _applyFavorite(int id, bool favorite) {
    setState(() {
      _items = [for (final s in _items) s.id == id ? s.copyWith(isFavorite: favorite) : s];
    });
  }

  Future<void> _toggle(Space space) async {
    setState(() => _favoriteError = '');
    final error = await toggleFavorite(context, space, _applyFavorite);
    if (mounted && error != null) setState(() => _favoriteError = error);
  }

  Future<void> _open(Space space) async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => SpaceDetailScreen(id: space.id)),
    );
    if (mounted) _load();
  }

  @override
  Widget build(BuildContext context) {
    final auth = AppScope.of(context).auth;
    // Saiu da conta com a tela aberta: favoritos exigem login.
    return ListenableBuilder(
      listenable: auth,
      builder: (context, _) {
        if (!auth.isLoggedIn) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (context.mounted) Navigator.of(context).maybePop();
          });
          return const Scaffold();
        }
        final shown = _items.where((s) => s.isFavorite).toList();
        final total = _meta == null ? 0 : _meta!.total - (_items.length - shown.length);

        return Scaffold(
          appBar: AppBar(title: const Text('Meus favoritos')),
          body: _loading && _items.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: shown.isEmpty && _error.isEmpty
                      ? ListView(children: [
                          EmptyState(
                            title: 'Você ainda não salvou nenhum local',
                            message: 'Toque no coração de um espaço para guardá-lo aqui.',
                            action: FilledButton(
                              onPressed: () => Navigator.of(context).maybePop(),
                              child: const Text('Explorar locais'),
                            ),
                          ),
                        ])
                      : ListView.separated(
                          controller: _scroll,
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                          itemCount: shown.length + 2,
                          separatorBuilder: (_, __) => const SizedBox(height: 14),
                          itemBuilder: (context, i) {
                            if (i == 0) {
                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (_error.isNotEmpty || _favoriteError.isNotEmpty) ...[
                                    InfoBanner(
                                      _error.isNotEmpty ? _error : _favoriteError,
                                      onClose: () => setState(() {
                                        _error = '';
                                        _favoriteError = '';
                                      }),
                                    ),
                                    const SizedBox(height: 8),
                                  ],
                                  Text(
                                    '$total ${total == 1 ? 'local salvo' : 'locais salvos'}',
                                    style: TextStyle(
                                        color: Theme.of(context).colorScheme.onSurfaceVariant),
                                  ),
                                ],
                              );
                            }
                            if (i == shown.length + 1) return ListFooter(loading: _loadingMore);
                            final space = shown[i - 1];
                            return SpaceCard(
                              space: space,
                              onTap: () => _open(space),
                              onToggleFavorite: () => _toggle(space),
                            );
                          },
                        ),
                ),
        );
      },
    );
  }
}
