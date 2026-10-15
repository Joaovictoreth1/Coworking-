import '../models/space.dart';
import 'api_client.dart';

/// Filtros da vitrine pública.
class SpaceFilters {
  final String q;
  final String priceType; // '' | hourly | daily | monthly | free
  final String minPrice; // texto digitado ("35,50")
  final String maxPrice;
  final String sort;

  const SpaceFilters({
    this.q = '',
    this.priceType = '',
    this.minPrice = '',
    this.maxPrice = '',
    this.sort = 'recent',
  });

  SpaceFilters copyWith({
    String? q,
    String? priceType,
    String? minPrice,
    String? maxPrice,
    String? sort,
  }) =>
      SpaceFilters(
        q: q ?? this.q,
        priceType: priceType ?? this.priceType,
        minPrice: minPrice ?? this.minPrice,
        maxPrice: maxPrice ?? this.maxPrice,
        sort: sort ?? this.sort,
      );

  /// Há filtro de preço ligado? (a ordenação não conta: não esconde resultados)
  bool get hasPriceFilter => priceType.isNotEmpty || minPrice.isNotEmpty || maxPrice.isNotEmpty;

  @override
  bool operator ==(Object other) =>
      other is SpaceFilters &&
      other.q == q &&
      other.priceType == priceType &&
      other.minPrice == minPrice &&
      other.maxPrice == maxPrice &&
      other.sort == sort;

  @override
  int get hashCode => Object.hash(q, priceType, minPrice, maxPrice, sort);

  Map<String, String> toQuery(int page) {
    final qs = <String, String>{};
    if (page > 1) qs['page'] = '$page';
    if (q.isNotEmpty) qs['q'] = q;
    if (priceType.isNotEmpty) qs['price_type'] = priceType;
    if (priceType != 'free') {
      final min = minPrice.isNotEmpty ? parseMoney(minPrice) : null;
      final max = maxPrice.isNotEmpty ? parseMoney(maxPrice) : null;
      if (min != null) qs['min_price'] = '$min';
      if (max != null) qs['max_price'] = '$max';
    }
    if (sort != 'recent') qs['sort'] = sort;
    return qs;
  }
}

class SpacesService {
  SpacesService(this._api);
  final ApiClient _api;

  Paginated<Space> _parsePage(Map<String, dynamic> res) => Paginated(
        (res['data'] as List)
            .map((e) => Space.fromJson(e as Map<String, dynamic>))
            .toList(),
        PageMeta.fromJson(res['meta'] as Map<String, dynamic>?),
      );

  Space _parseOne(Map<String, dynamic> res) =>
      Space.fromJson(res['data'] as Map<String, dynamic>);

  /* ---------------------------- Vitrine ---------------------------- */

  Future<Paginated<Space>> listPublic(SpaceFilters filters, {int page = 1}) async =>
      _parsePage(await _api.send('GET', '/spaces', query: filters.toQuery(page)));

  Future<Space> getPublic(int id) async => _parseOne(await _api.send('GET', '/spaces/$id'));

  /* --------------------------- Favoritos --------------------------- */

  Future<Paginated<Space>> listFavorites({int page = 1}) async => _parsePage(
        await _api.send('GET', '/favorites', query: page > 1 ? {'page': '$page'} : null),
      );

  Future<void> addFavorite(int spaceId) => _api.send('POST', '/spaces/$spaceId/favorite');

  Future<void> removeFavorite(int spaceId) => _api.send('DELETE', '/spaces/$spaceId/favorite');

  /* --------------------------- Avaliações --------------------------- */

  Future<ReviewsPage> listReviews(int spaceId, {int page = 1}) async {
    final res = await _api.send(
      'GET',
      '/spaces/$spaceId/reviews',
      query: page > 1 ? {'page': '$page'} : null,
    );
    return ReviewsPage(
      (res['data'] as List).map((e) => Review.fromJson(e as Map<String, dynamic>)).toList(),
      PageMeta.fromJson(res['meta'] as Map<String, dynamic>?),
      ReviewSummary.fromJson((res['summary'] as Map<String, dynamic>?) ?? {}),
      res['mine'] is Map<String, dynamic> ? Review.fromJson(res['mine'] as Map<String, dynamic>) : null,
    );
  }

  Future<void> saveReview(int spaceId, {required int rating, String? comment}) =>
      _api.send('POST', '/spaces/$spaceId/reviews', body: {'rating': rating, 'comment': comment});

  Future<void> deleteReview(int spaceId, int reviewId) =>
      _api.send('DELETE', '/spaces/$spaceId/reviews/$reviewId');

  /* ----------------------- Administração de locais ----------------------- */

  Future<Paginated<Space>> listAdmin({int page = 1, String q = '', String status = ''}) async {
    final qs = <String, String>{};
    if (page > 1) qs['page'] = '$page';
    if (q.isNotEmpty) qs['q'] = q;
    if (status.isNotEmpty) qs['status'] = status;
    return _parsePage(await _api.send('GET', '/admin/spaces', query: qs));
  }

  Future<Space> getAdmin(int id) async => _parseOne(await _api.send('GET', '/admin/spaces/$id'));

  Future<Space> create(Map<String, dynamic> payload) async =>
      _parseOne(await _api.send('POST', '/admin/spaces', body: payload));

  Future<Space> update(int id, Map<String, dynamic> payload) async =>
      _parseOne(await _api.send('PUT', '/admin/spaces/$id', body: payload));

  Future<void> delete(int id) => _api.send('DELETE', '/admin/spaces/$id');

  Future<Space> uploadPhotos(int id, List<String> filePaths) async => _parseOne(
        await _api.upload('/admin/spaces/$id/photos', field: 'photos', filePaths: filePaths),
      );

  Future<Space> deletePhoto(int spaceId, int photoId) async =>
      _parseOne(await _api.send('DELETE', '/admin/spaces/$spaceId/photos/$photoId'));

  Future<Space> reorderPhotos(int spaceId, List<int> ids) async =>
      _parseOne(await _api.send('PUT', '/admin/spaces/$spaceId/photos/order', body: {'ids': ids}));
}
