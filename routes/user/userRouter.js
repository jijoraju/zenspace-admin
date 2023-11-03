const express = require('express');
const {PrismaClient} = require("@prisma/client");
const {hash, genSalt} = require("bcrypt");

const prisma = new PrismaClient();
const userRouter = express.Router();


userRouter.get('/', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                userType: true
            }
        });
        res.render('users/index', {users});
    } catch (error) {
        req.flash('error', 'unable to load user.');
        res.redirect('/dashboard');
    }
});

userRouter.get('/:id/delete', async (req, res) => {
    try {
        await prisma.user.delete({
            where: { user_id: parseInt(req.params.id) }
        });
        req.flash('success', 'deleted user');
        res.redirect('/user');
    } catch (error) {
        req.flash('error', 'Failed to delete user.');
        res.redirect('/users');
    }
});

userRouter.get('/new', (req, res) => {
    res.render('users/new');
});

userRouter.post('/', async (req, res) => {
    try {
        // Hash the password
        const salt = await genSalt(10);
        const hashedPassword = await hash(req.body.password, salt);

        // Replace plain password with hashed password
        req.body.password = hashedPassword;
        req.body.user_type_id = parseInt(req.body.user_type_id, 10);

        await prisma.user.create({
            data: req.body
        });

        req.flash('success', 'User added successfully.');
        res.redirect('/user');
    } catch (error) {
        req.flash('error', 'Failed to add user.');
        res.redirect('/user/new');
    }
});

userRouter.get('/:id/edit', async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { user_id: parseInt(req.params.id) },
            include: { userType: true }
        });
        if (!user) {
            req.flash('error', 'User not found.');
            return res.redirect('/user');
        }
        res.render('users/edit', { user });
    } catch (error) {
        req.flash('error', 'Failed to retrieve user data.');
        res.redirect('/user');
    }
});

userRouter.post('/:id/update', async (req, res) => {
    try {
        await prisma.user.update({
            where: { user_id: parseInt(req.params.id) },
            data: req.body
        });
        req.flash('success', 'User updated successfully.');
        res.redirect('/user');
    } catch (error) {
        req.flash('error', 'Failed to update user.');
        res.redirect('/user/' + req.params.id + '/edit');
    }
});

userRouter.post('/:id/change-password', async (req, res) => {
    try {
        const newPassword = req.body.new_password;
        if(!newPassword || newPassword.length < 6) {
            req.flash('error', 'Password should be at least 6 characters.');
            return res.redirect('/user/' + req.params.id + '/edit');
        }
        const salt = await genSalt(10);
        const hashedPassword = await hash(newPassword, salt);
        await prisma.user.update({
            where: { user_id: parseInt(req.params.id) },
            data: { password: hashedPassword }
        });
        req.flash('success', 'Password changed successfully.');
        res.redirect('/user/' + req.params.id + '/edit');
    } catch (error) {
        req.flash('error', 'Failed to change password.');
        res.redirect('/user/' + req.params.id + '/edit');
    }
});



module.exports = userRouter;
