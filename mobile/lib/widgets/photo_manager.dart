import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../models/space.dart';
import 'common.dart';

/// Foto na tela do formulário: já salva (id + url) ou escolhida agora (path local).
class PhotoItem {
  final String key;
  final int? id;
  final String? url;
  final String? path;
  const PhotoItem({required this.key, this.id, this.url, this.path});

  bool get isNew => path != null;
}

const _acceptedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
const _maxOriginalBytes = 25 * 1024 * 1024; // antes da compressão

int _counter = 0;

class PhotoManager extends StatefulWidget {
  final List<PhotoItem> photos;
  final ValueChanged<List<PhotoItem>> onChange;
  final ValueChanged<PhotoItem> onRemove;
  final String? error;

  const PhotoManager({
    super.key,
    required this.photos,
    required this.onChange,
    required this.onRemove,
    this.error,
  });

  @override
  State<PhotoManager> createState() => _PhotoManagerState();
}

class _PhotoManagerState extends State<PhotoManager> {
  final _picker = ImagePicker();
  String _notice = '';

  Future<void> _pick() async {
    final room = maxPhotos - widget.photos.length;
    if (room <= 0) {
      setState(() => _notice = 'Limite de $maxPhotos fotos por local.');
      return;
    }

    // O próprio seletor já reduz a foto (lado maior ≤ 1600px) para o upload ficar leve.
    final picked = await _picker.pickMultiImage(
      maxWidth: 1600,
      maxHeight: 1600,
      imageQuality: 85,
    );
    if (picked.isEmpty || !mounted) return;

    final problems = <String>[];
    final valid = <XFile>[];
    for (final file in picked) {
      final ext = file.name.split('.').last.toLowerCase();
      if (!_acceptedExtensions.contains(ext)) {
        problems.add('"${file.name}" não é JPG, PNG ou WebP.');
      } else if (await file.length() > _maxOriginalBytes) {
        problems.add('"${file.name}" é grande demais (máx. 25 MB).');
      } else {
        valid.add(file);
      }
    }
    if (valid.length > room) problems.add('Limite de $maxPhotos fotos por local.');

    final items = valid
        .take(room)
        .map((f) => PhotoItem(key: 'new-${DateTime.now().microsecondsSinceEpoch}-${_counter++}', path: f.path))
        .toList();

    if (!mounted) return;
    setState(() => _notice = problems.join(' '));
    if (items.isNotEmpty) widget.onChange([...widget.photos, ...items]);
  }

  void _move(int from, int to) {
    final list = [...widget.photos];
    final item = list.removeAt(from);
    list.insert(to, item);
    widget.onChange(list);
  }

  void _makeCover(int index) {
    final list = [...widget.photos];
    final item = list.removeAt(index);
    list.insert(0, item);
    widget.onChange(list);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final photos = widget.photos;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Até $maxPhotos fotos (JPG, PNG ou WebP). A primeira é a capa do local.',
          style: TextStyle(color: theme.colorScheme.onSurfaceVariant, fontSize: 13),
        ),
        const SizedBox(height: 12),
        if (photos.isNotEmpty)
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: photos.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 4 / 3,
            ),
            itemBuilder: (context, i) {
              final photo = photos[i];
              return ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Stack(fit: StackFit.expand, children: [
                  photo.isNew
                      ? Image.file(File(photo.path!), fit: BoxFit.cover)
                      : NetImage(photo.url),
                  if (i == 0)
                    Positioned(
                      left: 6,
                      top: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text('Capa',
                            style: TextStyle(
                                color: theme.colorScheme.onPrimary,
                                fontSize: 12,
                                fontWeight: FontWeight.w600)),
                      ),
                    ),
                  if (photo.isNew)
                    Positioned(
                      right: 6,
                      top: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                            color: Colors.black54, borderRadius: BorderRadius.circular(4)),
                        child: const Text('Nova',
                            style: TextStyle(color: Colors.white, fontSize: 11)),
                      ),
                    ),
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    child: Container(
                      color: Colors.black54,
                      child: Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
                        _MiniButton(Icons.chevron_left, 'Mover para trás',
                            i > 0 ? () => _move(i, i - 1) : null),
                        _MiniButton(Icons.star_outline, 'Definir como capa',
                            i > 0 ? () => _makeCover(i) : null),
                        _MiniButton(Icons.chevron_right, 'Mover para frente',
                            i < photos.length - 1 ? () => _move(i, i + 1) : null),
                        _MiniButton(Icons.delete_outline, 'Remover foto', () => widget.onRemove(photo)),
                      ]),
                    ),
                  ),
                ]),
              );
            },
          ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: photos.length >= maxPhotos ? null : _pick,
          icon: const Icon(Icons.upload_outlined),
          label: Text('Adicionar fotos (${photos.length}/$maxPhotos)'),
        ),
        if (_notice.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(_notice, style: TextStyle(color: theme.colorScheme.error)),
          ),
        if (widget.error != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(widget.error!, style: TextStyle(color: theme.colorScheme.error)),
          ),
      ],
    );
  }
}

class _MiniButton extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback? onPressed;
  const _MiniButton(this.icon, this.tooltip, this.onPressed);

  @override
  Widget build(BuildContext context) => IconButton(
        tooltip: tooltip,
        visualDensity: VisualDensity.compact,
        iconSize: 20,
        color: Colors.white,
        disabledColor: Colors.white30,
        icon: Icon(icon),
        onPressed: onPressed,
      );
}
