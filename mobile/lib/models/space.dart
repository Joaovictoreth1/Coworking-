// Modelos, constantes e formatação dos locais (espelha frontend/src/lib/spaces.ts).

double? _toDouble(dynamic v) {
  if (v == null) return null;
  if (v is num) return v.toDouble();
  return double.tryParse(v.toString());
}

class DaySchedule {
  final int day; // 0 = domingo ... 6 = sábado
  final bool enabled;
  final String from; // "HH:MM"
  final String to;

  const DaySchedule({
    required this.day,
    required this.enabled,
    required this.from,
    required this.to,
  });

  factory DaySchedule.fromJson(Map<String, dynamic> j) => DaySchedule(
        day: (j['day'] as num).toInt(),
        enabled: j['enabled'] == true,
        from: (j['from'] as String?) ?? '08:00',
        to: (j['to'] as String?) ?? '18:00',
      );

  DaySchedule copyWith({bool? enabled, String? from, String? to}) => DaySchedule(
        day: day,
        enabled: enabled ?? this.enabled,
        from: from ?? this.from,
        to: to ?? this.to,
      );

  Map<String, dynamic> toJson() =>
      {'day': day, 'enabled': enabled, 'from': from, 'to': to};
}

class SpacePhoto {
  final int id;
  final String url;
  const SpacePhoto({required this.id, required this.url});

  factory SpacePhoto.fromJson(Map<String, dynamic> j) =>
      SpacePhoto(id: (j['id'] as num).toInt(), url: j['url'] as String);
}

class Space {
  final int id;
  final String name;
  final String? description;
  final int? capacity;
  final String? zipCode;
  final String street;
  final String? number;
  final String? complement;
  final String? neighborhood;
  final String city;
  final String state;
  final double? hourlyPrice;
  final double? dailyPrice;
  final double? monthlyPrice;
  final bool isFree;
  final double? ratingAvg;
  final int reviewsCount;
  final bool isFavorite;
  final int ownerId;
  final String? ownerName; // só na listagem administrativa
  final List<DaySchedule> openingHours;
  final List<DaySchedule> availability;
  final List<String> amenities;
  final bool isActive;
  final List<SpacePhoto> photos;
  final String? coverUrl;

  const Space({
    required this.id,
    required this.name,
    this.description,
    this.capacity,
    this.zipCode,
    required this.street,
    this.number,
    this.complement,
    this.neighborhood,
    required this.city,
    required this.state,
    this.hourlyPrice,
    this.dailyPrice,
    this.monthlyPrice,
    required this.isFree,
    this.ratingAvg,
    required this.reviewsCount,
    required this.isFavorite,
    required this.ownerId,
    this.ownerName,
    required this.openingHours,
    required this.availability,
    required this.amenities,
    required this.isActive,
    required this.photos,
    this.coverUrl,
  });

  factory Space.fromJson(Map<String, dynamic> j) {
    List<DaySchedule> schedule(dynamic v) => v is List
        ? v.map((e) => DaySchedule.fromJson(e as Map<String, dynamic>)).toList()
        : <DaySchedule>[];

    final owner = j['owner'];
    return Space(
      id: (j['id'] as num).toInt(),
      name: j['name'] as String,
      description: j['description'] as String?,
      capacity: (j['capacity'] as num?)?.toInt(),
      zipCode: j['zip_code'] as String?,
      street: (j['street'] as String?) ?? '',
      number: j['number'] as String?,
      complement: j['complement'] as String?,
      neighborhood: j['neighborhood'] as String?,
      city: (j['city'] as String?) ?? '',
      state: (j['state'] as String?) ?? '',
      hourlyPrice: _toDouble(j['hourly_price']),
      dailyPrice: _toDouble(j['daily_price']),
      monthlyPrice: _toDouble(j['monthly_price']),
      isFree: j['is_free'] == true,
      ratingAvg: _toDouble(j['rating_avg']),
      reviewsCount: (j['reviews_count'] as num?)?.toInt() ?? 0,
      isFavorite: j['is_favorite'] == true,
      ownerId: (j['owner_id'] as num?)?.toInt() ?? 0,
      ownerName: owner is Map ? owner['name'] as String? : null,
      openingHours: schedule(j['opening_hours']),
      availability: schedule(j['availability']),
      amenities: (j['amenities'] as List?)?.map((e) => e.toString()).toList() ?? [],
      isActive: j['is_active'] != false,
      photos: (j['photos'] as List?)
              ?.map((e) => SpacePhoto.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      coverUrl: j['cover_url'] as String?,
    );
  }

  Space copyWith({bool? isFavorite, double? ratingAvg, bool clearRating = false, int? reviewsCount}) =>
      Space(
        id: id,
        name: name,
        description: description,
        capacity: capacity,
        zipCode: zipCode,
        street: street,
        number: number,
        complement: complement,
        neighborhood: neighborhood,
        city: city,
        state: state,
        hourlyPrice: hourlyPrice,
        dailyPrice: dailyPrice,
        monthlyPrice: monthlyPrice,
        isFree: isFree,
        ratingAvg: clearRating ? null : (ratingAvg ?? this.ratingAvg),
        reviewsCount: reviewsCount ?? this.reviewsCount,
        isFavorite: isFavorite ?? this.isFavorite,
        ownerId: ownerId,
        ownerName: ownerName,
        openingHours: openingHours,
        availability: availability,
        amenities: amenities,
        isActive: isActive,
        photos: photos,
        coverUrl: coverUrl,
      );
}

class PageMeta {
  final int currentPage;
  final int lastPage;
  final int total;
  const PageMeta({required this.currentPage, required this.lastPage, required this.total});

  factory PageMeta.fromJson(Map<String, dynamic>? j) => PageMeta(
        currentPage: (j?['current_page'] as num?)?.toInt() ?? 1,
        lastPage: (j?['last_page'] as num?)?.toInt() ?? 1,
        total: (j?['total'] as num?)?.toInt() ?? 0,
      );

  bool get hasMore => currentPage < lastPage;
}

class Paginated<T> {
  final List<T> data;
  final PageMeta meta;
  const Paginated(this.data, this.meta);
}

class Review {
  final int id;
  final int rating;
  final String? comment;
  final String author;
  final bool isMine;
  final DateTime updatedAt;

  const Review({
    required this.id,
    required this.rating,
    this.comment,
    required this.author,
    required this.isMine,
    required this.updatedAt,
  });

  factory Review.fromJson(Map<String, dynamic> j) => Review(
        id: (j['id'] as num).toInt(),
        rating: (j['rating'] as num).toInt(),
        comment: j['comment'] as String?,
        author: (j['author'] as String?) ?? '',
        isMine: j['is_mine'] == true,
        updatedAt: DateTime.tryParse((j['updated_at'] as String?) ?? '') ?? DateTime.now(),
      );
}

class ReviewSummary {
  final double? average;
  final int count;
  final Map<int, int> distribution; // nota (1-5) -> quantidade

  const ReviewSummary({this.average, required this.count, required this.distribution});

  factory ReviewSummary.fromJson(Map<String, dynamic> j) {
    final dist = <int, int>{};
    final raw = j['distribution'];
    if (raw is Map) {
      raw.forEach((k, v) {
        final key = int.tryParse(k.toString());
        if (key != null) dist[key] = (v as num).toInt();
      });
    }
    return ReviewSummary(
      average: _toDouble(j['average']),
      count: (j['count'] as num?)?.toInt() ?? 0,
      distribution: dist,
    );
  }
}

class ReviewsPage {
  final List<Review> reviews;
  final PageMeta meta;
  final ReviewSummary summary;
  final Review? mine;
  const ReviewsPage(this.reviews, this.meta, this.summary, this.mine);
}

/* --------------------------- Constantes --------------------------- */

class PriceTypeOption {
  final String value; // '' = todos
  final String label;
  final String unit;
  const PriceTypeOption(this.value, this.label, this.unit);
}

const priceTypes = [
  PriceTypeOption('', 'Todos', ''),
  PriceTypeOption('hourly', 'Por hora', '/hora'),
  PriceTypeOption('daily', 'Diária', '/dia'),
  PriceTypeOption('monthly', 'Mensal', '/mês'),
  PriceTypeOption('free', 'Gratuitos', ''),
];

const sortOptions = <String, String>{
  'recent': 'Mais recentes',
  'price_asc': 'Menor preço',
  'price_desc': 'Maior preço',
  'rating': 'Melhor avaliados',
};

class Weekday {
  final int day;
  final String label;
  final String short;
  const Weekday(this.day, this.label, this.short);
}

// Ordem de exibição: segunda a domingo
const weekdays = [
  Weekday(1, 'Segunda-feira', 'Seg'),
  Weekday(2, 'Terça-feira', 'Ter'),
  Weekday(3, 'Quarta-feira', 'Qua'),
  Weekday(4, 'Quinta-feira', 'Qui'),
  Weekday(5, 'Sexta-feira', 'Sex'),
  Weekday(6, 'Sábado', 'Sáb'),
  Weekday(0, 'Domingo', 'Dom'),
];

List<DaySchedule> defaultSchedule() => [
      for (final w in weekdays)
        DaySchedule(day: w.day, enabled: w.day >= 1 && w.day <= 5, from: '08:00', to: '18:00'),
    ];

/// Garante os 7 dias na ordem de exibição, mesmo que a API devolva algo incompleto.
List<DaySchedule> normalizeSchedule(List<DaySchedule> schedule) {
  final fallback = defaultSchedule();
  return [
    for (var i = 0; i < weekdays.length; i++)
      schedule.where((d) => d.day == weekdays[i].day).firstOrNull ?? fallback[i],
  ];
}

const amenities = <String, String>{
  'wifi': 'Wi-Fi rápido',
  'air_conditioning': 'Ar-condicionado',
  'coffee': 'Café',
  'call_booths': 'Cabines de call',
  'meeting_rooms': 'Salas de reunião',
  'projector': 'Projetor / TV',
  'whiteboard': 'Lousa / quadro branco',
  'printer': 'Impressora',
  'kitchen': 'Cozinha / copa',
  'parking': 'Estacionamento',
  'reception': 'Recepção',
  'lockers': 'Armários',
  'accessibility': 'Acessibilidade',
  'security': 'Segurança 24h',
};

String amenityLabel(String value) => amenities[value] ?? value;

const brStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const maxPhotos = 10;

/* --------------------------- Formatação --------------------------- */

String _groupThousands(String digits) {
  final out = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) out.write('.');
    out.write(digits[i]);
  }
  return out.toString();
}

/// 1234.5 -> "R$ 1.234,50"
String formatBRL(double value) {
  final fixed = value.abs().toStringAsFixed(2).split('.');
  return '${value < 0 ? '-' : ''}R\$ ${_groupThousands(fixed[0])},${fixed[1]}';
}

/// 4.5 -> "4,5"
String formatRating(double value) => value.toStringAsFixed(1).replaceAll('.', ',');

const _months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

String formatDate(DateTime d) {
  final l = d.toLocal();
  return '${l.day.toString().padLeft(2, '0')} ${_months[l.month - 1]} ${l.year}';
}

class PriceEntry {
  final String key;
  final double value;
  final String unit;
  final String label;
  const PriceEntry(this.key, this.value, this.unit, this.label);
}

/// Preços cobrados pelo local, na ordem hora, dia, mês (vazio se for gratuito).
List<PriceEntry> priceList(Space s) => [
      if (s.hourlyPrice != null) PriceEntry('hourly', s.hourlyPrice!, '/hora', 'Por hora'),
      if (s.dailyPrice != null) PriceEntry('daily', s.dailyPrice!, '/dia', 'Por dia'),
      if (s.monthlyPrice != null) PriceEntry('monthly', s.monthlyPrice!, '/mês', 'Mensal'),
    ];

/// "A, B e C"
String joinList(List<String> items) {
  if (items.length <= 1) return items.join();
  return '${items.sublist(0, items.length - 1).join(', ')} e ${items.last}';
}

/// "1.234,50" | "35,5" | "35.5" -> número (ou null se vazio/inválido)
double? parseMoney(String text) {
  var t = text.replaceAll(RegExp(r'[^\d.,]'), '');
  if (t.isEmpty) return null;
  if (t.contains(',')) t = t.replaceAll('.', '').replaceAll(',', '.');
  return double.tryParse(t);
}

String moneyToInput(double? value) =>
    value == null ? '' : value.toStringAsFixed(2).replaceAll('.', ',');

String formatAddress(Space s) {
  final line = [
    (s.number != null && s.number!.isNotEmpty) ? '${s.street}, ${s.number}' : s.street,
    if (s.neighborhood != null && s.neighborhood!.isNotEmpty) s.neighborhood!,
  ].join(' – ');
  return '$line · ${s.city}/${s.state}';
}

String peopleLabel(int capacity) => 'Até $capacity ${capacity == 1 ? 'pessoa' : 'pessoas'}';

/// Ex.: "Seg a Sex, 08:00–18:00" (ou "Seg, Ter (horários variados)")
String summarizeSchedule(List<DaySchedule> schedule) {
  final byDay = {for (final d in schedule) d.day: d};
  final active = <({Weekday w, int index, DaySchedule entry})>[];
  for (var i = 0; i < weekdays.length; i++) {
    final entry = byDay[weekdays[i].day];
    if (entry != null && entry.enabled) active.add((w: weekdays[i], index: i, entry: entry));
  }
  if (active.isEmpty) return 'Nenhum dia';

  final first = active.first.entry;
  final sameHours = active.every((a) => a.entry.from == first.from && a.entry.to == first.to);
  var contiguous = true;
  for (var i = 1; i < active.length; i++) {
    if (active[i].index != active[i - 1].index + 1) contiguous = false;
  }

  final days = contiguous && active.length > 2
      ? '${active.first.w.short} a ${active.last.w.short}'
      : active.map((a) => a.w.short).join(', ');

  return sameHours ? '$days, ${first.from}–${first.to}' : '$days (horários variados)';
}
