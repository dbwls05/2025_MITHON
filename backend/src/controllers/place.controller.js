const placeService = require('../services/place.service');
const postService = require('../services/post.service');
const { parsePage } = require('../utils/pagination');
const { parseIdParam } = require('../utils/validate');

// GET /api/places
async function list(req, res) {
  res.json(await placeService.listPlaces({ userId: req.userId, schoolId: req.schoolId }));
}

// GET /api/places/favorites
async function favorites(req, res) {
  res.json(await placeService.listFavorites({ userId: req.userId }));
}

// PUT /api/places/:placeId/favorite
async function addFavorite(req, res) {
  const placeId = parseIdParam(req.params.placeId);
  res.json(await placeService.addFavorite({ userId: req.userId, schoolId: req.schoolId, placeId }));
}

// DELETE /api/places/:placeId/favorite
async function removeFavorite(req, res) {
  const placeId = parseIdParam(req.params.placeId);
  res.json(await placeService.removeFavorite({ userId: req.userId, placeId }));
}

// GET /api/places/:placeId/posts?cursor=&limit=
async function posts(req, res) {
  const placeId = parseIdParam(req.params.placeId);
  const page = parsePage(req.query);
  await placeService.assertPlaceInSchool(placeId, req.schoolId);
  res.json(await postService.listPosts({ viewerId: req.userId, placeId, page }));
}

module.exports = { list, favorites, addFavorite, removeFavorite, posts };
