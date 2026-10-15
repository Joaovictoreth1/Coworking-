import 'package:flutter/material.dart';

import '../app_scope.dart';
import '../models/space.dart';
import '../screens/login_screen.dart';
import '../services/auth_service.dart';
import 'common.dart';
import 'stars.dart';

const _maxComment = 2000;

/// Avaliações de um local: resumo, formulário da própria pessoa e lista.
class ReviewsSection extends StatefulWidget {
  final int spaceId;
  final int ownerId;
  final ValueChanged<ReviewSummary>? onSummaryChanged;

  const ReviewsSection({
    super.key,
    required this.spaceId,
    required this.ownerId,
    this.onSummaryChanged,
  });

  @override
  State<ReviewsSection> createState() => _ReviewsSectionState();
}

class _ReviewsSectionState extends State<ReviewsSection> {
  final _commentCtrl = TextEditingController();

  List<Review> _items = [];
  ReviewSummary? _summary;
  Review? _mine;
  int _page = 1;
  int _lastPage = 1;
  bool _loading = true;
  bool _loadingMore = false;
  String _error = '';

  int _rating = 0;
  String _formError = '';
  bool _saving = false;
  bool _saved = false;
  int? _userId;
  AuthService? _auth;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final auth = AppScope.of(context).auth;
    if (_auth != auth) {
      _auth?.removeListener(_onAuthChanged);
      _auth = auth..addListener(_onAuthChanged);
      _userId = auth.user?.id;
      _load();
    }
  }

  @override
  void dispose() {
    _auth?.removeListener(_onAuthChanged);
    _commentCtrl.dispose();
    super.dispose();
  }

  // Entrou/saiu da conta: recarrega (a avaliação "minha" muda).
  void _onAuthChanged() {
    if (_auth?.user?.id != _userId) {
      _userId = _auth?.user?.id;
      _load();
    }
  }

  Future<void> _load() async {
    try {
      final res = await AppScope.of(context).spaces.listReviews(widget.spaceId);
      if (!mounted) return;
      setState(() {
        _items = res.reviews;
        _page = 1;
        _lastPage = res.meta.lastPage;
        _summary = res.summary;
        _mine = res.mine;
        _rating = res.mine?.rating ?? 0;
        _commentCtrl.text = res.mine?.comment ?? '';
        _error = '';
      });
      widget.onSummaryChanged?.call(res.summary);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadMore() async {
    setState(() => _loadingMore = true);
    try {
      final res =
          await AppScope.of(context).spaces.listReviews(widget.spaceId, page: _page + 1);
      if (!mounted) return;
      setState(() {
        final known = _items.map((r) => r.id).toSet();
        _items = [..._items, ...res.reviews.where((r) => !known.contains(r.id))];
        _page = res.meta.currentPage;
        _lastPage = res.meta.lastPage;
      });
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  Future<void> _submit() async {
    if (_rating < 1) {
      setState(() => _formError = 'Escolha uma nota de 1 a 5 estrelas.');
      return;
    }
    setState(() {
      _saving = true;
      _formError = '';
      _saved = false;
    });
    try {
      final comment = _commentCtrl.text.trim();
      await AppScope.of(context).spaces.saveReview(
            widget.spaceId,
            rating: _rating,
            comment: comment.isEmpty ? null : comment,
          );
      await _load();
      if (mounted) setState(() => _saved = true);
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _formError =
            e.fieldErrors.isNotEmpty ? e.fieldErrors.values.first : e.message);
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete(Review review) async {
    final ok = await confirmDialog(
      context,
      title: 'Remover avaliação?',
      message: review.isMine
          ? 'Sua nota e seu comentário serão apagados e a média do local será recalculada.'
          : 'A avaliação de ${review.author} será apagada e a média do local será recalculada.',
      confirmLabel: 'Remover',
    );
    if (!ok || !mounted) return;
    try {
      await AppScope.of(context).spaces.deleteReview(widget.spaceId, review.id);
      if (mounted) setState(() => _saved = false);
      await _load();
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final auth = AppScope.of(context).auth;
    final user = auth.user;
    final summary = _summary;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Avaliações',
            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 12),
        if (_error.isNotEmpty) ...[
          InfoBanner(_error, onClose: () => setState(() => _error = '')),
          const SizedBox(height: 12),
        ],
        if (_loading && summary == null)
          const Padding(
            padding: EdgeInsets.all(16),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (summary != null) ...[
          _SummaryCard(summary: summary),
          const SizedBox(height: 16),
          Card(
            margin: EdgeInsets.zero,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: user == null
                  ? Row(children: [
                      TextButton(
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => LoginScreen(auth: auth)),
                        ),
                        child: const Text('Entre na sua conta'),
                      ),
                      const Expanded(child: Text('para avaliar este local.')),
                    ])
                  : user.id == widget.ownerId
                      ? const Text(
                          'Este local é seu, então a avaliação fica por conta de quem o visita.')
                      : _buildForm(),
            ),
          ),
          const SizedBox(height: 16),
          if (_items.isEmpty)
            const Text('Este local ainda não tem avaliações. Seja a primeira pessoa a avaliar.')
          else
            Card(
              margin: EdgeInsets.zero,
              child: Column(children: [
                for (var i = 0; i < _items.length; i++) ...[
                  if (i > 0) const Divider(height: 1),
                  _ReviewTile(
                    review: _items[i],
                    canModerate: user?.isAdmin == true && !_items[i].isMine,
                    onDelete: () => _delete(_items[i]),
                  ),
                ],
              ]),
            ),
          if (_page < _lastPage) ...[
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: _loadingMore ? null : _loadMore,
              child: Text(_loadingMore ? 'Carregando...' : 'Ver mais avaliações'),
            ),
          ],
        ],
      ],
    );
  }

  Widget _buildForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(_mine != null ? 'Sua avaliação' : 'Deixe sua avaliação',
            style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        StarInput(value: _rating, enabled: !_saving, onChanged: (v) => setState(() => _rating = v)),
        const SizedBox(height: 8),
        TextField(
          controller: _commentCtrl,
          enabled: !_saving,
          maxLines: 3,
          maxLength: _maxComment,
          textCapitalization: TextCapitalization.sentences,
          decoration: const InputDecoration(
            labelText: 'Comentário (opcional)',
            hintText: 'Como foi a internet, o silêncio, o atendimento, a estrutura?',
            border: OutlineInputBorder(),
          ),
        ),
        if (_formError.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(_formError, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ),
        if (_saved && _formError.isEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text('Avaliação salva. Obrigado!', style: TextStyle(color: Colors.green.shade800)),
          ),
        FilledButton(
          onPressed: _saving ? null : _submit,
          child: Text(_saving
              ? 'Salvando...'
              : _mine != null
                  ? 'Atualizar avaliação'
                  : 'Publicar avaliação'),
        ),
        if (_mine != null)
          TextButton(
            onPressed: _saving ? null : () => _delete(_mine!),
            child: const Text('Excluir minha avaliação'),
          ),
      ],
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final ReviewSummary summary;
  const _SummaryCard({required this.summary});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurfaceVariant;
    final maxCount = [1, ...summary.distribution.values].reduce((a, b) => a > b ? a : b);

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          SizedBox(
            width: 104,
            child: Column(children: [
              Text(summary.average != null ? formatRating(summary.average!) : '–',
                  style: theme.textTheme.displaySmall?.copyWith(fontWeight: FontWeight.bold)),
              if (summary.average != null) Stars(value: summary.average!, size: 16),
              const SizedBox(height: 4),
              Text('${summary.count} ${summary.count == 1 ? 'avaliação' : 'avaliações'}',
                  textAlign: TextAlign.center, style: TextStyle(color: muted, fontSize: 12)),
            ]),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(children: [
              for (final stars in [5, 4, 3, 2, 1])
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 3),
                  child: Row(children: [
                    SizedBox(width: 28, child: Text('$stars ★', style: TextStyle(color: muted))),
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(3),
                        child: LinearProgressIndicator(
                          value: (summary.distribution[stars] ?? 0) / maxCount,
                          minHeight: 8,
                          color: const Color(0xFFF59E0B),
                          backgroundColor: theme.colorScheme.surfaceContainerHighest,
                        ),
                      ),
                    ),
                    SizedBox(
                      width: 28,
                      child: Text('${summary.distribution[stars] ?? 0}',
                          textAlign: TextAlign.right, style: TextStyle(color: muted)),
                    ),
                  ]),
                ),
            ]),
          ),
        ]),
      ),
    );
  }
}

class _ReviewTile extends StatelessWidget {
  final Review review;
  final bool canModerate;
  final VoidCallback onDelete;
  const _ReviewTile({required this.review, required this.canModerate, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurfaceVariant;
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(
              child: Wrap(spacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
                Text(review.author, style: const TextStyle(fontWeight: FontWeight.w600)),
                if (review.isMine)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 1),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text('Você',
                        style: TextStyle(fontSize: 12, color: theme.colorScheme.onPrimaryContainer)),
                  ),
              ]),
            ),
            if (canModerate)
              IconButton(
                tooltip: 'Remover (moderação)',
                visualDensity: VisualDensity.compact,
                icon: const Icon(Icons.delete_outline),
                onPressed: onDelete,
              ),
          ]),
          const SizedBox(height: 4),
          Row(children: [
            Stars(value: review.rating.toDouble()),
            const SizedBox(width: 8),
            Text(formatDate(review.updatedAt), style: TextStyle(color: muted, fontSize: 13)),
          ]),
          if (review.comment != null && review.comment!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(review.comment!),
          ],
        ],
      ),
    );
  }
}
