module.exports = function authorizeAdmin(req, res, next) {
    // Check if the user is authenticated
    if (!req.isAuthenticated()) {
        return res.render('unauthorized', {message: 'You must be logged in to access this page.'});
    }

    // Check if the authenticated user has an admin role
    if (req.user && req.user.userType && req.user.userType.type_description === 'admin') {
        return next();
    } else {
        return res.render('unauthorized', {message: 'You do not have the necessary permissions to access this page.'});
    }
}
