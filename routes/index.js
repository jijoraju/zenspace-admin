const express = require('express');
const passport = require('../config/passport')
const authorizeAdmin = require('../middleware/authorizeAdmin')
const {PrismaClient} = require("@prisma/client");
const {compare} = require("bcrypt");
const jwt = require('jsonwebtoken');

const userRouter = require('./user/userRouter')
const workspaceRouter = require('./workspace/workspaceRouter')
const locationRouter = require('./location/locationRouter')


const router = express.Router();

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret';

router.get('/', (req, res) => {
    res.render('login', {title: 'Login', message: ''});
});

router.post('/', passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/',
    failureFlash: true
}));

router.get('/dashboard', (req, res) => {
    res.render('dashboard', {title: 'Dashboard'});
});

router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});


router.use('/user', userRouter);
router.use('/workspace', workspaceRouter);
router.use('/locations', locationRouter);

module.exports = router;
