const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const {PrismaClient} = require("@prisma/client");
const {compare} = require("bcrypt");

const prisma = new PrismaClient();

passport.use(new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password'
    },
    async function (email, password, done) {
        const user = await prisma.user.findUnique({
            where: {email: email},
            include: {
                userType: true
            }
        });

        if (!user) {
            return done(null, false, {message: 'Incorrect email.'});
        }

        if (!await compare(password, user.password)) {
            return done(null, false, {message: 'Incorrect password.'});
        }

        // Check user role
        if (user.userType.type_description !== 'admin') {
            return done(null, false, {message: 'You do not have the necessary permissions to log in.'});
        }

        return done(null, user);
    }
));

passport.serializeUser(function (user, done) {
    done(null, user.user_id);
});

passport.deserializeUser(async function (id, done) {
    const user = await prisma.user.findUnique({
        where: {user_id: id},
        include: {
            userType: true
        }
    });
    done(null, user);
});

module.exports = passport;
