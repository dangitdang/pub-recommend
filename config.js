module.exports.db = {
	client : 'pg',
	connection: process.env.POSTGRES,
};
module.exports.actions = {
	'read' : 1,
	'dislike' : -5,
	'like' : 2,
	'comment' : 1,
	'feature' : 10
};
module.exports.exclusiveActions = {
	'like' : 'dislike',
};
