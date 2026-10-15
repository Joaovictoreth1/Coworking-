import 'dart:async';

import 'package:flutter/material.dart';

import '../../app_scope.dart';
import '../../models/space.dart';
import '../../services/auth_service.dart';
import '../../widgets/common.dart';
import 'space_form_screen.dart';

const _statusOptions = <String, String>{
  '': 'Todos os status',
  'active': 'Ativos',
  'inactive': 'Inativos',
};

/// Painel de locais (admin vê todos; usuário comum vê os seus).
class SpacesListScreen extends StatefulWidget {
  const SpacesListScreen({super.key});

  @override
  State<SpacesListScreen> createState() => _SpacesListScreenState();
}

class _SpacesListScreenState extends State<SpacesListScreen> {
  final _scroll = ScrollController();
  Timer? _debounce;

  List<Space> _items = [];
  PageMeta? _meta;
  bool _loading = true;
  bool _loadingMore = false;
  String _error = '';
  String _query = '';
  String _status = '';
  int _requestId = 0;

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
    _debounce?.cancel();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final id = ++_requestId;
    setState(() {
      _loading = true;
      _error = '';
    });
    try {
      final res =
          await AppScope.of(context).spaces.listAdmin(q: _query, status: _status);
      if (!mounted || id != _requestId) return;
      setState(() {
        _items = res.data;
        _meta = res.meta;
      });
    } on ApiException catch (e) {
      if (mounted && id == _requestId) setState(() => _error = e.message);
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
          .listAdmin(page: meta.currentPage + 1, q: _query, status: _status);
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

  void _onSearch(String text) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      final next = text.trim();
      if (next != _query) {
        _query = next;
        _load();
      }
    });
  }

  void _toast(String text, {bool error = false}) {
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(SnackBar(
      content: Text(text),
      backgroundColor: error ? Theme.of(context).colorScheme.error : null,
    ));
  }

  /// Abre o formulário; ele devolve o recado de sucesso ao salvar.
  Future<void> _openForm({int? id}) async {
    final message = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => SpaceFormScreen(id: id)),
    );
    if (!mounted) return;
    if (message != null) _toast(message);
    _load();
  }

  Future<void> _delete(Space space) async {
    final ok = await confirmDialog(
      context,
      title: 'Excluir local?',
      message:
          '"${space.name}" e todas as suas fotos serão removidos. Essa ação não pode ser desfeita.',
    );
    if (!ok || !mounted) return;
    try {
      await AppScope.of(context).spaces.delete(space.id);
      if (!mounted) return;
      _toast('Local excluído.');
      _load();
    } on ApiException catch (e) {
      if (mounted) _toast(e.message, error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = AppScope.of(context).auth;
    return ListenableBuilder(
      listenable: auth,
      builder: (context, _) {
        // Área restrita: sem login, volta (a tela de login é aberta pela Home).
        if (!auth.isLoggedIn) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (context.mounted) Navigator.of(context).maybePop();
          });
          return const Scaffold();
        }
        final filtering = _query.isNotEmpty || _status.isNotEmpty;
        return Scaffold(
          appBar: AppBar(
            title: Text(auth.user!.isAdmin ? 'Gerenciar locais' : 'Meus locais'),
          ),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _openForm(),
            icon: const Icon(Icons.add),
            label: const Text('Novo local'),
          ),
          body: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: TextField(
                  textInputAction: TextInputAction.search,
                  decoration: const InputDecoration(
                    hintText: 'Buscar por nome, rua, bairro ou cidade',
                    prefixIcon: Icon(Icons.search),
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  onChanged: _onSearch,
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                child: DropdownButtonFormField<String>(
                  initialValue: _status,
                  isDense: true,
                  decoration: const InputDecoration(border: OutlineInputBorder()),
                  items: [
                    for (final e in _statusOptions.entries)
                      DropdownMenuItem(value: e.key, child: Text(e.value)),
                  ],
                  onChanged: (v) {
                    _status = v ?? '';
                    _load();
                  },
                ),
              ),
              if (_meta != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      '${_meta!.total} ${_meta!.total == 1 ? 'local cadastrado' : 'locais cadastrados'}${filtering ? ' neste filtro' : ''}',
                      style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                  ),
                ),
              Expanded(child: _buildBody(filtering)),
            ],
          ),
        );
      },
    );
  }

  Widget _buildBody(bool filtering) {
    if (_error.isNotEmpty && _items.isEmpty) {
      return ListView(padding: const EdgeInsets.all(16), children: [
        InfoBanner(_error),
        const SizedBox(height: 12),
        OutlinedButton(onPressed: _load, child: const Text('Tentar de novo')),
      ]);
    }
    if (_loading && _items.isEmpty) return const Center(child: CircularProgressIndicator());

    return RefreshIndicator(
      onRefresh: _load,
      child: _items.isEmpty
          ? ListView(children: [
              EmptyState(
                title: filtering ? 'Nenhum local encontrado' : 'Nenhum local cadastrado ainda',
                message: filtering
                    ? 'Tente outro termo de busca ou mude o filtro de status.'
                    : 'Cadastre o primeiro espaço para começar.',
              ),
            ])
          : ListView.separated(
              controller: _scroll,
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
              itemCount: _items.length + 1,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, i) {
                if (i == _items.length) return ListFooter(loading: _loadingMore);
                final space = _items[i];
                return _SpaceTile(
                  space: space,
                  onEdit: () => _openForm(id: space.id),
                  onDelete: () => _delete(space),
                );
              },
            ),
    );
  }
}

class _SpaceTile extends StatelessWidget {
  final Space space;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  const _SpaceTile({required this.space, required this.onEdit, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurfaceVariant;
    final prices = space.isFree
        ? 'Gratuito'
        : priceList(space).map((p) => '${formatBRL(p.value)}${p.unit}').join(' · ');

    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onEdit,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                SizedBox(
                  width: 96,
                  height: 72,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: NetImage(space.coverUrl),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(space.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
                      decoration: BoxDecoration(
                        color: space.isActive ? Colors.green.shade100 : Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(space.isActive ? 'Ativo' : 'Inativo',
                          style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: space.isActive ? Colors.green.shade900 : Colors.black87)),
                    ),
                  ]),
                ),
              ]),
              const SizedBox(height: 10),
              Text(formatAddress(space), style: TextStyle(color: muted)),
              const SizedBox(height: 4),
              Text(prices, style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 2),
              Text(
                '${space.ratingAvg != null ? '★ ${formatRating(space.ratingAvg!)} (${space.reviewsCount}) · ' : 'Sem avaliações · '}'
                'Disponível: ${summarizeSchedule(space.availability)}'
                '${space.ownerName != null ? ' · Responsável: ${space.ownerName}' : ''}',
                style: TextStyle(color: muted, fontSize: 12),
              ),
              const SizedBox(height: 4),
              Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                TextButton.icon(
                  onPressed: onEdit,
                  icon: const Icon(Icons.edit_outlined, size: 18),
                  label: const Text('Editar'),
                ),
                IconButton(
                  tooltip: 'Excluir ${space.name}',
                  color: theme.colorScheme.error,
                  icon: const Icon(Icons.delete_outline),
                  onPressed: onDelete,
                ),
              ]),
            ],
          ),
        ),
      ),
    );
  }
}
