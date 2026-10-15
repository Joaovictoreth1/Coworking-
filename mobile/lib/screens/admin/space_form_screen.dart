import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

import '../../app_scope.dart';
import '../../models/space.dart';
import '../../services/auth_service.dart';
import '../../widgets/amenity_picker.dart';
import '../../widgets/common.dart';
import '../../widgets/photo_manager.dart';
import '../../widgets/weekly_schedule.dart';

/// Cadastro e edição de local. Ao salvar, fecha devolvendo a mensagem de sucesso.
class SpaceFormScreen extends StatefulWidget {
  final int? id;
  final String? initialNotice;
  final bool initialNoticeIsError;

  const SpaceFormScreen({
    super.key,
    this.id,
    this.initialNotice,
    this.initialNoticeIsError = true,
  });

  @override
  State<SpaceFormScreen> createState() => _SpaceFormScreenState();
}

// Seções na ordem da tela; usadas para rolar até o primeiro erro.
const _errorSections = [
  'name',
  'description',
  'capacity',
  'zip_code',
  'street',
  'number',
  'complement',
  'neighborhood',
  'city',
  'state',
  'pricing',
  'hourly_price',
  'daily_price',
  'monthly_price',
  'availability',
  'opening_hours',
  'amenities',
  'photos',
];

class _SpaceFormScreenState extends State<SpaceFormScreen> {
  bool get _isEdit => widget.id != null;

  final _controllers = <String, TextEditingController>{};
  final _keys = <String, GlobalKey>{};

  TextEditingController _c(String name) =>
      _controllers.putIfAbsent(name, () => TextEditingController());
  GlobalKey _k(String name) => _keys.putIfAbsent(name, () => GlobalKey());

  String _uf = '';
  bool _hourlyOn = true;
  bool _dailyOn = false;
  bool _monthlyOn = false;
  bool _isFree = false;
  bool _isActive = true;
  List<DaySchedule> _openingHours = defaultSchedule();
  List<DaySchedule> _availability = defaultSchedule();
  List<String> _amenities = [];
  List<PhotoItem> _photos = [];
  final List<int> _removedIds = [];

  Map<String, String> _errors = {};
  String _message = '';
  String? _notice;
  bool _noticeIsError = true;
  bool _loading = false;
  String _loadError = '';
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _notice = widget.initialNotice;
    _noticeIsError = widget.initialNoticeIsError;
    if (_isEdit) {
      _loading = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => _loadSpace());
    }
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  /* ----------------------------- Carregar ----------------------------- */

  Future<void> _loadSpace() async {
    try {
      final space = await AppScope.of(context).spaces.getAdmin(widget.id!);
      if (mounted) setState(() => _applySpace(space));
    } on ApiException catch (e) {
      if (mounted) setState(() => _loadError = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _applySpace(Space s) {
    _c('name').text = s.name;
    _c('description').text = s.description ?? '';
    _c('capacity').text = s.capacity?.toString() ?? '';
    _c('zip_code').text = s.zipCode ?? '';
    _c('street').text = s.street;
    _c('number').text = s.number ?? '';
    _c('complement').text = s.complement ?? '';
    _c('neighborhood').text = s.neighborhood ?? '';
    _c('city').text = s.city;
    _uf = s.state;
    _hourlyOn = s.hourlyPrice != null;
    _dailyOn = s.dailyPrice != null;
    _monthlyOn = s.monthlyPrice != null;
    _c('hourly_price').text = moneyToInput(s.hourlyPrice);
    _c('daily_price').text = moneyToInput(s.dailyPrice);
    _c('monthly_price').text = moneyToInput(s.monthlyPrice);
    _isFree = s.isFree;
    _openingHours = normalizeSchedule(s.openingHours);
    _availability = normalizeSchedule(s.availability);
    _amenities = [...s.amenities];
    _isActive = s.isActive;
    _photos = [for (final p in s.photos) PhotoItem(key: 'photo-${p.id}', id: p.id, url: p.url)];
    _removedIds.clear();
  }

  /* ----------------------------- Validação ----------------------------- */

  String? _orNull(String text) => text.trim().isEmpty ? null : text.trim();

  // Mesmas regras do servidor, para avisar antes de enviar.
  Map<String, String> _validate() {
    final errors = <String, String>{};
    String t(String n) => _c(n).text.trim();

    if (t('name').isEmpty) errors['name'] = 'Informe o nome do local.';
    if (t('capacity').isNotEmpty && !RegExp(r'^[1-9]\d*$').hasMatch(t('capacity'))) {
      errors['capacity'] = 'Informe um número inteiro maior que zero.';
    }
    if (t('zip_code').isNotEmpty && !RegExp(r'^\d{5}-?\d{3}$').hasMatch(t('zip_code'))) {
      errors['zip_code'] = 'CEP inválido. Use o formato 00000-000.';
    }
    if (t('street').isEmpty) errors['street'] = 'Informe a rua.';
    if (t('city').isEmpty) errors['city'] = 'Informe a cidade.';
    if (_uf.isEmpty) errors['state'] = 'Informe o estado.';

    if (!_isFree) {
      if (!_hourlyOn && !_dailyOn && !_monthlyOn) {
        errors['pricing'] =
            'Escolha ao menos uma forma de cobrança (hora, dia ou mês) ou marque o local como gratuito.';
      }
      for (final entry in {
        'hourly_price': _hourlyOn,
        'daily_price': _dailyOn,
        'monthly_price': _monthlyOn,
      }.entries) {
        if (!entry.value) continue;
        final price = parseMoney(_c(entry.key).text);
        if (price == null || price <= 0) errors[entry.key] = 'Informe um preço maior que zero.';
      }
    }

    void checkSchedule(String field, List<DaySchedule> list) {
      for (var i = 0; i < list.length; i++) {
        final d = list[i];
        if (!d.enabled) continue;
        if (d.from.isEmpty) errors['$field.$i.from'] = 'Informe a hora de início.';
        if (d.to.isEmpty) {
          errors['$field.$i.to'] = 'Informe a hora de término.';
        } else if (d.from.isNotEmpty && d.to.compareTo(d.from) <= 0) {
          errors['$field.$i.to'] = 'O término deve ser depois do início.';
        }
      }
    }

    checkSchedule('opening_hours', _openingHours);
    checkSchedule('availability', _availability);
    if (!_availability.any((d) => d.enabled)) {
      errors['availability'] = 'Marque ao menos um dia disponível para locação.';
    }
    return errors;
  }

  Map<String, dynamic> _payload() => {
        'name': _c('name').text.trim(),
        'description': _orNull(_c('description').text),
        'capacity': _c('capacity').text.trim().isEmpty ? null : int.parse(_c('capacity').text.trim()),
        'zip_code': _orNull(_c('zip_code').text),
        'street': _c('street').text.trim(),
        'number': _orNull(_c('number').text),
        'complement': _orNull(_c('complement').text),
        'neighborhood': _orNull(_c('neighborhood').text),
        'city': _c('city').text.trim(),
        'state': _uf,
        // Espaço gratuito não tem preços
        'hourly_price': !_isFree && _hourlyOn ? parseMoney(_c('hourly_price').text) : null,
        'daily_price': !_isFree && _dailyOn ? parseMoney(_c('daily_price').text) : null,
        'monthly_price': !_isFree && _monthlyOn ? parseMoney(_c('monthly_price').text) : null,
        'is_free': _isFree,
        'opening_hours': _openingHours.map((d) => d.toJson()).toList(),
        'availability': _availability.map((d) => d.toJson()).toList(),
        'amenities': _amenities,
        'is_active': _isActive,
      };

  void _scrollToFirstError() {
    String? target;
    for (final section in _errorSections) {
      if (_errors.keys.any((k) => k == section || k.startsWith('$section.'))) {
        target = section;
        break;
      }
    }
    target ??= _errors.isEmpty ? null : _errorSections.first;
    final ctx = target == null ? null : _keys[target]?.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(ctx,
          alignment: 0.1, duration: const Duration(milliseconds: 300));
    }
  }

  /* ------------------------------ CEP ------------------------------ */

  String _formatZip(String value) {
    final digits = value.replaceAll(RegExp(r'\D'), '');
    final cut = digits.length > 8 ? digits.substring(0, 8) : digits;
    return cut.length > 5 ? '${cut.substring(0, 5)}-${cut.substring(5)}' : cut;
  }

  void _changeZip(String value) {
    final zip = _formatZip(value);
    final ctrl = _c('zip_code');
    if (ctrl.text != zip) {
      ctrl.value = TextEditingValue(
        text: zip,
        selection: TextSelection.collapsed(offset: zip.length),
      );
    }
    if (zip.length == 9) _lookupZip(zip);
  }

  Future<void> _lookupZip(String zip) async {
    final digits = zip.replaceAll(RegExp(r'\D'), '');
    try {
      final res = await http
          .get(Uri.parse('https://viacep.com.br/ws/$digits/json/'))
          .timeout(const Duration(seconds: 8));
      final data = jsonDecode(res.body);
      if (data is! Map || data['erro'] != null) return;
      // Só preenche o que está vazio e só se o CEP não mudou durante a consulta
      if (!mounted || _c('zip_code').text.replaceAll(RegExp(r'\D'), '') != digits) return;
      setState(() {
        void fill(String name, dynamic v) {
          if (_c(name).text.isEmpty && v is String) _c(name).text = v;
        }

        fill('street', data['logradouro']);
        fill('neighborhood', data['bairro']);
        fill('city', data['localidade']);
        if (_uf.isEmpty && data['uf'] is String && brStates.contains(data['uf'])) {
          _uf = data['uf'] as String;
        }
      });
    } catch (_) {
      // Sem internet ou serviço fora do ar: o endereço segue manual
    }
  }

  /* ------------------------------ Fotos ------------------------------ */

  void _removePhoto(PhotoItem item) {
    setState(() {
      if (!item.isNew && item.id != null) _removedIds.add(item.id!);
      _photos = [for (final p in _photos) if (p.key != item.key) p];
    });
  }

  // Aplica as mudanças de fotos depois que o local foi salvo
  Future<void> _syncPhotos(int spaceId, Space saved) async {
    final spaces = AppScope.of(context).spaces;
    for (final photoId in _removedIds) {
      await spaces.deletePhoto(spaceId, photoId);
    }

    final added = _photos.where((p) => p.isNew).toList();
    var current = saved;
    if (added.isNotEmpty) {
      current = await spaces.uploadPhotos(spaceId, added.map((p) => p.path!).toList());
    }

    // Descobre os ids das fotos recém-enviadas (chegam no fim, na ordem de envio)
    final known = _photos.where((p) => p.id != null).map((p) => p.id).toSet();
    final fresh = current.photos
        .map((p) => p.id)
        .where((id) => !known.contains(id) && !_removedIds.contains(id))
        .toList();

    var next = 0;
    final wanted = <int?>[
      for (final p in _photos) p.id ?? (next < fresh.length ? fresh[next++] : null),
    ];
    final finalIds = wanted.whereType<int>().toList();
    if (finalIds.length != wanted.length) return;

    final serverIds =
        current.photos.map((p) => p.id).where((id) => !_removedIds.contains(id)).toList();
    if (finalIds.join(',') != serverIds.join(',')) {
      await spaces.reorderPhotos(spaceId, finalIds);
    }
  }

  /* ------------------------------ Salvar ------------------------------ */

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _message = '';
      _notice = null;
      _errors = _validate();
    });
    if (_errors.isNotEmpty) {
      setState(() => _message = 'Confira os campos destacados.');
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToFirstError());
      return;
    }

    final spaces = AppScope.of(context).spaces;
    final navigator = Navigator.of(context);
    setState(() => _submitting = true);
    Space? saved;
    try {
      final payload = _payload();
      saved = _isEdit ? await spaces.update(widget.id!, payload) : await spaces.create(payload);
      await _syncPhotos(saved.id, saved);
      if (!mounted) return;
      navigator.pop(_isEdit ? 'Local atualizado com sucesso.' : 'Local cadastrado com sucesso.');
    } on ApiException catch (e) {
      if (!mounted) return;
      final reason = e.fieldErrors.isNotEmpty ? e.fieldErrors.values.first : e.message;
      if (saved == null) {
        // Falhou ao salvar o local em si
        setState(() {
          _errors = e.fieldErrors;
          _message = e.fieldErrors.isNotEmpty ? 'Confira os campos destacados.' : reason;
        });
        WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToFirstError());
      } else if (!_isEdit) {
        // Local criado, fotos não: abre a edição dele para tentar de novo
        navigator.pushReplacement(MaterialPageRoute(
          builder: (_) => SpaceFormScreen(
            id: saved!.id,
            initialNotice: 'O local foi cadastrado, mas as fotos não foram enviadas: $reason',
          ),
        ));
      } else {
        // Local atualizado, fotos não: recarrega o estado real do servidor
        setState(() {
          _noticeIsError = true;
          _notice = 'As alterações foram salvas, mas houve um problema com as fotos: $reason';
        });
        try {
          final fresh = await spaces.getAdmin(saved.id);
          if (mounted) setState(() => _applySpace(fresh));
        } on ApiException {
          // mantém a tela como está
        }
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  /* -------------------------------- UI -------------------------------- */

  Widget _text(
    String name,
    String label, {
    String? hint,
    TextInputType? keyboard,
    int? maxLength,
    int maxLines = 1,
    List<TextInputFormatter>? formatters,
    ValueChanged<String>? onChanged,
    String? prefix,
    TextCapitalization capitalization = TextCapitalization.none,
  }) {
    return KeyedSubtree(
      key: _k(name),
      child: TextField(
        controller: _c(name),
        keyboardType: keyboard,
        maxLength: maxLength,
        maxLines: maxLines,
        inputFormatters: formatters,
        textCapitalization: capitalization,
        onChanged: onChanged,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          prefixText: prefix,
          border: const OutlineInputBorder(),
          errorText: _errors[name],
          errorMaxLines: 3,
        ),
      ),
    );
  }

  Widget _section(String title, List<Widget> children, {String? description}) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            if (description != null)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(description,
                    style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 13)),
              ),
            const SizedBox(height: 16),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _priceOption(String name, String title, String description, bool on, ValueChanged<bool> set) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(
          color: on
              ? Theme.of(context).colorScheme.primary
              : Theme.of(context).colorScheme.outlineVariant,
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(children: [
        SwitchListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(title),
          subtitle: Text(description),
          value: on,
          onChanged: set,
        ),
        if (on)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: _text(
              name,
              'Preço',
              prefix: 'R\$ ',
              hint: '0,00',
              keyboard: const TextInputType.numberWithOptions(decimal: true),
              formatters: [FilteringTextInputFormatter.allow(RegExp(r'[\d.,]'))],
            ),
          ),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final noPriceMode = !_isFree && !_hourlyOn && !_dailyOn && !_monthlyOn;
    final pricingError = _errors['pricing'] ?? (noPriceMode ? _errors['hourly_price'] : null);

    return Scaffold(
      appBar: AppBar(title: Text(_isEdit ? 'Editar local' : 'Novo local')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _loadError.isNotEmpty
              ? ListView(padding: const EdgeInsets.all(16), children: [InfoBanner(_loadError)])
              : Column(children: [
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        if (_notice != null) ...[
                          InfoBanner(_notice!,
                              error: _noticeIsError, onClose: () => setState(() => _notice = null)),
                          const SizedBox(height: 16),
                        ],
                        _section('Informações básicas', [
                          _text('name', 'Nome do local',
                              hint: 'Ex.: Sala de reunião Paulista',
                              capitalization: TextCapitalization.sentences),
                          const SizedBox(height: 16),
                          _text('description', 'Descrição',
                              hint: 'Conte o que torna o espaço especial...',
                              maxLines: 4,
                              maxLength: 5000,
                              capitalization: TextCapitalization.sentences),
                          const SizedBox(height: 8),
                          _text('capacity', 'Capacidade (pessoas) — opcional',
                              hint: 'Ex.: 8',
                              keyboard: TextInputType.number,
                              formatters: [
                                FilteringTextInputFormatter.digitsOnly,
                                LengthLimitingTextInputFormatter(6),
                              ]),
                        ]),
                        const SizedBox(height: 16),
                        _section(
                          'Endereço',
                          description:
                              'Digite o CEP para preencher rua, bairro e cidade automaticamente.',
                          [
                            _text('zip_code', 'CEP',
                                hint: '00000-000',
                                keyboard: TextInputType.number,
                                onChanged: _changeZip),
                            const SizedBox(height: 16),
                            _text('street', 'Rua',
                                capitalization: TextCapitalization.words),
                            const SizedBox(height: 16),
                            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Expanded(
                                child: _text('number', 'Número', hint: 'S/N', maxLength: 20),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                flex: 2,
                                child: _text('complement', 'Complemento',
                                    hint: 'Andar, sala...', maxLength: 100),
                              ),
                            ]),
                            const SizedBox(height: 8),
                            _text('neighborhood', 'Bairro',
                                maxLength: 100, capitalization: TextCapitalization.words),
                            const SizedBox(height: 8),
                            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Expanded(
                                flex: 2,
                                child: _text('city', 'Cidade',
                                    maxLength: 100, capitalization: TextCapitalization.words),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: KeyedSubtree(
                                  key: _k('state'),
                                  child: Padding(
                                    padding: const EdgeInsets.only(top: 0),
                                    child: DropdownButtonFormField<String>(
                                      key: ValueKey('uf-$_uf'),
                                      initialValue: _uf.isEmpty ? null : _uf,
                                      decoration: InputDecoration(
                                        labelText: 'UF',
                                        border: const OutlineInputBorder(),
                                        errorText: _errors['state'],
                                      ),
                                      items: [
                                        for (final uf in brStates)
                                          DropdownMenuItem(value: uf, child: Text(uf)),
                                      ],
                                      onChanged: (v) => setState(() => _uf = v ?? ''),
                                    ),
                                  ),
                                ),
                              ),
                            ]),
                          ],
                        ),
                        const SizedBox(height: 16),
                        _section(
                          'Preços e disponibilidade',
                          description:
                              'Escolha como o local pode ser alugado (ou se é gratuito) e em quais dias e horários ele fica disponível.',
                          [
                            Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                border: Border.all(
                                  color: _isFree
                                      ? Colors.green.shade400
                                      : theme.colorScheme.outlineVariant,
                                ),
                                color: _isFree ? Colors.green.shade50 : null,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: SwitchListTile(
                                contentPadding: EdgeInsets.zero,
                                title: Text('Espaço 100% gratuito',
                                    style: TextStyle(color: _isFree ? Colors.black87 : null)),
                                subtitle: Text(
                                  'Para bibliotecas públicas, centros culturais e outros locais de entrada livre. Os preços ficam desativados.',
                                  style: TextStyle(color: _isFree ? Colors.black54 : null),
                                ),
                                value: _isFree,
                                onChanged: (v) => setState(() => _isFree = v),
                              ),
                            ),
                            if (!_isFree) ...[
                              KeyedSubtree(
                                key: _k('pricing'),
                                child: Column(children: [
                                  _priceOption('hourly_price', 'Locação por hora',
                                      'Cobra pelo período em horas.', _hourlyOn,
                                      (v) => setState(() => _hourlyOn = v)),
                                  _priceOption('daily_price', 'Locação por dia',
                                      'Cobra pelo dia inteiro.', _dailyOn,
                                      (v) => setState(() => _dailyOn = v)),
                                  _priceOption('monthly_price', 'Pacote mensal',
                                      'Cobra um valor fixo por mês de uso.', _monthlyOn,
                                      (v) => setState(() => _monthlyOn = v)),
                                ]),
                              ),
                              if (pricingError != null)
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: Text(pricingError,
                                      style: TextStyle(color: theme.colorScheme.error)),
                                ),
                            ],
                            Text('Dias e horários disponíveis para locação',
                                style: theme.textTheme.titleSmall),
                            const SizedBox(height: 4),
                            Text(
                              'Na locação por hora vale a faixa de horário de cada dia; nas locações por dia e mensal vale apenas o dia marcado.',
                              style: TextStyle(
                                  color: theme.colorScheme.onSurfaceVariant, fontSize: 12),
                            ),
                            const SizedBox(height: 8),
                            KeyedSubtree(
                              key: _k('availability'),
                              child: WeeklySchedule(
                                name: 'availability',
                                offLabel: 'Indisponível',
                                value: _availability,
                                errors: _errors,
                                onChanged: (v) => setState(() => _availability = v),
                                actions: [
                                  TextButton(
                                    onPressed: () => setState(() => _availability =
                                        _openingHours.map((d) => d.copyWith()).toList()),
                                    child: const Text('Copiar do horário de funcionamento'),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        _section(
                          'Horário de funcionamento',
                          description:
                              'Quando o local está aberto. É a informação mostrada ao cliente.',
                          [
                            KeyedSubtree(
                              key: _k('opening_hours'),
                              child: WeeklySchedule(
                                name: 'opening_hours',
                                offLabel: 'Fechado',
                                value: _openingHours,
                                errors: _errors,
                                onChanged: (v) => setState(() => _openingHours = v),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        _section('Comodidades', description: 'Marque o que o local oferece.', [
                          KeyedSubtree(
                            key: _k('amenities'),
                            child: AmenityPicker(
                              value: _amenities,
                              error: _errors['amenities'],
                              onChanged: (v) => setState(() => _amenities = v),
                            ),
                          ),
                        ]),
                        const SizedBox(height: 16),
                        _section('Fotos', [
                          KeyedSubtree(
                            key: _k('photos'),
                            child: PhotoManager(
                              photos: _photos,
                              error: _errors['photos'],
                              onChange: (v) => setState(() => _photos = v),
                              onRemove: _removePhoto,
                            ),
                          ),
                        ]),
                        const SizedBox(height: 16),
                        _section('Publicação', [
                          SwitchListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(_isActive ? 'Local ativo' : 'Local inativo'),
                            subtitle: const Text(
                                'Locais inativos continuam cadastrados, mas ficam fora da oferta.'),
                            value: _isActive,
                            onChanged: (v) => setState(() => _isActive = v),
                          ),
                        ]),
                      ],
                    ),
                  ),
                  // Barra fixa de ações
                  Material(
                    elevation: 8,
                    child: SafeArea(
                      top: false,
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
                        child: Column(mainAxisSize: MainAxisSize.min, children: [
                          if (_message.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Text(_message,
                                  style: TextStyle(color: theme.colorScheme.error)),
                            ),
                          Row(children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: _submitting ? null : () => Navigator.of(context).maybePop(),
                                child: const Text('Cancelar'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              flex: 2,
                              child: FilledButton(
                                onPressed: _submitting ? null : _submit,
                                child: _submitting
                                    ? const SizedBox(
                                        height: 20,
                                        width: 20,
                                        child: CircularProgressIndicator(strokeWidth: 2),
                                      )
                                    : Text(_isEdit ? 'Salvar alterações' : 'Cadastrar local'),
                              ),
                            ),
                          ]),
                        ]),
                      ),
                    ),
                  ),
                ]),
    );
  }
}
