import bcrypt from 'bcrypt';

export function ValidateUserAndPassword(password, user) {
    try {
        if (user && bcrypt.compareSync(password, user.password)) {
            return true;
        }
        return false;
    } catch (err) {
        return console.error('validatePassword: ', err);
    }
}

export function fetchToken(headers) {
    const { authorization } = headers;
    const token = authorization?.trim().replace('Bearer', '');
    return token;
}