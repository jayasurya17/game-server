`use strict`

module.exports = {
	session: process.env.SESSION,
	token: process.env.TOKEN,
	database: {
		mongoDbUrl: process.env.MONGODB_URL,
		name: process.env.DATABASE,
		user: process.env.DB_USERNAME,
		password: process.env.DB_PASSWORD,
		host: process.env.DB_HOST,
		port: process.env.DB_DBPORT,
		dialect: process.env.DB_DIALECT,
	},
	firebase: {
		"type": "service_account",
		"project_id": process.env.FIREBASE_PROJECT_ID,
		"private_key_id": process.env.FIREBASE_KEY_ID,
		"private_key": process.env.FIREBASE_KEY,
		"client_email": process.env.FIREBASE_CLIENT_EMAIL,
		"client_id": process.env.FIREBASE_CLIENT,
		"auth_uri": "https://accounts.google.com/o/oauth2/auth",
		"token_uri": "https://oauth2.googleapis.com/token",
		"auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
		"client_x509_cert_url": process.env.FIREBASE_CLIENT_CERT
	},
	frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000", // For now no use of frontend urls in backend, when security is tighetened, add expected urls to cors.
}
