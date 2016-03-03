module.exports = {
	nearestNeighbors : 5,
	className : 'pub',
	numOfRecsStore : 30,
	factorLeastSimilarLeastLiked : false
}

module.exports.db = {
	client : 'pg',
	connection: 'postgres://nrqlklez:21pj36gSxBwH5E_75qP5E1QRsv8-kaRM@pellefant.db.elephantsql.com:5432/nrqlklez',
}
module.exports.actions = {
	'read' : 1,
	'dislike' : -5,
	'like' : 5,
	'comment' : 1
}
module.exports.exclusiveActions = {
	'like' : 'dislike'
}