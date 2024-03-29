import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import Users from '../../../models/mongoDB/users';
import Game from '../../../models/mongoDB/game';
import GameMember from '../../../models/mongoDB/gameMember';
import Messages from '../../../models/mongoDB/messages';
import constants from '../../../utils/constants';
import config from '../../../../config';

let transporter = nodemailer.createTransport({
	host: 'smtp.gmail.com',
	port: 465,
	secure: true,
	// service: 'gmail',
	auth: {
		user: config.nodemailer.EMAIL_ID,
		pass: config.nodemailer.APP_PASSWORD,
	},
});

/**
 * Get all users.
 * @param  {Object} req request object
 * @param  {Object} res response object
 */
exports.allUsers = async (req, res) => {
	try {

		if (!config.adminPortalAccess.includes(req.body.email)) {
			return res
				.status(constants.STATUS_CODE.UNAUTHORIZED_ERROR_STATUS)
				.send({ msg: "Not an admin" })
		}

		let allUsers = await Users.find().sort('userName')

		return res
			.status(constants.STATUS_CODE.ACCEPTED_STATUS)
			.send(allUsers)

	} catch (error) {
		console.log(`Error while getting getAllUsers ${error}`)
		return res
			.status(constants.STATUS_CODE.INTERNAL_SERVER_ERROR_STATUS)
			.send({ msg: error.message })
	}
}


/**
 * Get all users.
 * @param  {Object} req request object
 * @param  {Object} res response object
 */
exports.getMessages = async (req, res) => {
	try {

		if (!config.adminPortalAccess.includes(req.body.email)) {
			return res
				.status(constants.STATUS_CODE.UNAUTHORIZED_ERROR_STATUS)
				.send({ msg: "Not an admin" })
		}

		let allMessages = await Messages.find().sort('-createdAt')

		return res
			.status(constants.STATUS_CODE.ACCEPTED_STATUS)
			.send(allMessages)

	} catch (error) {
		console.log(`Error while getting getAllUsers ${error}`)
		return res
			.status(constants.STATUS_CODE.INTERNAL_SERVER_ERROR_STATUS)
			.send({ msg: error.message })
	}
}


/**
 * Get all users.
 * @param  {Object} req request object
 * @param  {Object} res response object
 */
exports.claimOldUsername = async (req, res) => {
	try {

		if (!config.adminPortalAccess.includes(req.body.email)) {
			return res
				.status(constants.STATUS_CODE.UNAUTHORIZED_ERROR_STATUS)
				.send({ msg: "Not an admin" })
		}

		const currentUserName = req.body.currentUserName
		const oldUserName = req.body.oldUserName
		const newUserName = req.body.newUserName

		if (newUserName != currentUserName && newUserName != oldUserName) {
			return res
				.status(constants.STATUS_CODE.BAD_REQUEST_ERROR_STATUS)
				.send({ msg: "New username has to either current or old username" })
		}

		let oldUserNameObj = await Users.findOne({ userName: oldUserName })
		let currentUserNameObj = await Users.findOne({ userName: currentUserName })

		if (oldUserNameObj && currentUserNameObj) {

			if (oldUserNameObj.email) {
				return res
					.status(constants.STATUS_CODE.BAD_REQUEST_ERROR_STATUS)
					.send({ msg: "Cannot claim username with email address" })
			}

			if (!currentUserNameObj.email) {
				return res
					.status(constants.STATUS_CODE.BAD_REQUEST_ERROR_STATUS)
					.send({ msg: "Current username does not have email address" })
			}

			let randomUserName = Math.random().toString(36).substring(2,)
			randomUserName = oldUserName + "___" + randomUserName
			randomUserName = randomUserName.substring(0, 50)

			await Users.findOneAndUpdate(
				{
					userName: oldUserName
				},
				{
					userName: randomUserName,
					isActive: false
				}
			)

			await Users.findOneAndUpdate(
				{
					userName: currentUserName
				},
				{
					userName: newUserName,
					$inc: {
						totalGames: oldUserNameObj.totalGames,
						totalWins: oldUserNameObj.totalWins,
						totalDeclares: oldUserNameObj.totalDeclares,
						totalFifties: oldUserNameObj.totalFifties,
						totalPairs: oldUserNameObj.totalPairs
					}
				}
			)

			transporter.sendMail({
				from: config.nodemailer.EMAIL_ID,
				to: currentUserNameObj.email,
				subject: "Request to claim username in declare game complete",
				// text: "Hello world?", 
				html: `<p>Your stats from <b>${currentUserName}</b> and <b>${oldUserName}</b> has been merged into single account with username: <b>${newUserName}</b></p>
						<p><b>Your stats</b></p>
						<table>
							<tr>
								<th></th>
								<th>Previous</th>
								<th>Current</th>
							</tr>
							<tr>
								<td>Total Games</td>
								<td>${currentUserNameObj.totalGames}</td>
								<td>${currentUserNameObj.totalGames + oldUserNameObj.totalGames}</td>
							</tr>
							<tr>
								<td>Total wins</td>
								<td>${currentUserNameObj.totalWins}</td>
								<td>${currentUserNameObj.totalWins + oldUserNameObj.totalWins}</td>
							</tr>
							<tr>
								<td>Declares</td>
								<td>${currentUserNameObj.totalDeclares}</td>
								<td>${currentUserNameObj.totalDeclares + oldUserNameObj.totalDeclares}</td>
							</tr>
							<tr>
								<td>-25's</td>
								<td>${currentUserNameObj.totalFifties}</td>
								<td>${currentUserNameObj.totalFifties + oldUserNameObj.totalFifties}</td>
							</tr>
							<tr>
								<td>+50's</td>
								<td>${currentUserNameObj.totalPairs}</td>
								<td>${currentUserNameObj.totalPairs + oldUserNameObj.totalPairs}</td>
							</tr>
							</table>
							<br><br><p style="color:gray;font-size:10px;">This is an automated email, please do not reply to this message. Please send us a message from <b>'Accounts'</b> tab if you wish to contact us.</p>
							`
			});

			transporter.sendMail({
				from: config.nodemailer.EMAIL_ID,
				to: config.adminEmail,
				subject: "Request to claim username in declare game complete",
				// text: "Hello world?", 
				html: `<p>User stats from <b>${currentUserName}</b> and <b>${oldUserName}</b> has been merged into single account with username: <b>${newUserName}</b></p>
						<p><b>User stats</b></p>
						<table>
							<tr>
								<th></th>
								<th>Previous</th>
								<th>Current</th>
							</tr>
							<tr>
								<td>Total Games</td>
								<td>${currentUserNameObj.totalGames}</td>
								<td>${currentUserNameObj.totalGames + oldUserNameObj.totalGames}</td>
							</tr>
							<tr>
								<td>Total wins</td>
								<td>${currentUserNameObj.totalWins}</td>
								<td>${currentUserNameObj.totalWins + oldUserNameObj.totalWins}</td>
							</tr>
							<tr>
								<td>Declares</td>
								<td>${currentUserNameObj.totalDeclares}</td>
								<td>${currentUserNameObj.totalDeclares + oldUserNameObj.totalDeclares}</td>
							</tr>
							<tr>
								<td>-25's</td>
								<td>${currentUserNameObj.totalFifties}</td>
								<td>${currentUserNameObj.totalFifties + oldUserNameObj.totalFifties}</td>
							</tr>
							<tr>
								<td>+50's</td>
								<td>${currentUserNameObj.totalPairs}</td>
								<td>${currentUserNameObj.totalPairs + oldUserNameObj.totalPairs}</td>
							</tr>
							</table>
							`
			});

			return res
				.status(constants.STATUS_CODE.ACCEPTED_STATUS)
				.send({ msg: "Update success" })
		} else {
			return res
				.status(constants.STATUS_CODE.BAD_REQUEST_ERROR_STATUS)
				.send({ msg: "Invalid usernames" })
		}

	} catch (error) {
		console.log(`Error while getting getAllUsers ${error}`)
		return res
			.status(constants.STATUS_CODE.INTERNAL_SERVER_ERROR_STATUS)
			.send({ msg: error.message })
	}
}


/**
 * Get all users.
 * @param  {Object} req request object
 * @param  {Object} res response object
 */
exports.markMessageAsSeen = async (req, res) => {
	try {

		if (!config.adminPortalAccess.includes(req.body.email)) {
			return res
				.status(constants.STATUS_CODE.UNAUTHORIZED_ERROR_STATUS)
				.send({ msg: "Not an admin" })
		}

		if (req.params.messageId == "null") {
			return res.status(204).json()
		}

		await Messages.findByIdAndUpdate(
			req.params.messageId,
			{
				seen: true
			}
		)

		let allMessages = await Messages.find()

		return res
			.status(constants.STATUS_CODE.ACCEPTED_STATUS)
			.send(allMessages)

	} catch (error) {
		console.log(`Error while getting getAllUsers ${error}`)
		return res
			.status(constants.STATUS_CODE.INTERNAL_SERVER_ERROR_STATUS)
			.send({ msg: error.message })
	}
}



/**
 * Get all users.
 * @param  {Object} req request object
 * @param  {Object} res response object
 */
exports.markMessageAsUnseen = async (req, res) => {
	try {

		if (!config.adminPortalAccess.includes(req.body.email)) {
			return res
				.status(constants.STATUS_CODE.UNAUTHORIZED_ERROR_STATUS)
				.send({ msg: "Not an admin" })
		}

		if (req.params.messageId == "null") {
			return res.status(204).json()
		}

		await Messages.findByIdAndUpdate(
			req.params.messageId,
			{
				seen: false
			}
		)

		let allMessages = await Messages.find()

		return res
			.status(constants.STATUS_CODE.ACCEPTED_STATUS)
			.send(allMessages)

	} catch (error) {
		console.log(`Error while getting getAllUsers ${error}`)
		return res
			.status(constants.STATUS_CODE.INTERNAL_SERVER_ERROR_STATUS)
			.send({ msg: error.message })
	}
}


/**
 * Get all users.
 * @param  {Object} req request object
 * @param  {Object} res response object
 */
exports.deactivateUser = async (req, res) => {
	try {

		if (!config.adminPortalAccess.includes(req.body.email)) {
			return res
				.status(constants.STATUS_CODE.UNAUTHORIZED_ERROR_STATUS)
				.send({ msg: "Not an admin" })
		}

		if (req.params.userId == "null") {
			return res.status(204).json()
		}

		await Users.findByIdAndUpdate(
			req.params.userId,
			{
				isActive: false
			}
		)

		let allUsers = await Users.find()

		return res
			.status(constants.STATUS_CODE.ACCEPTED_STATUS)
			.send(allUsers)

	} catch (error) {
		console.log(`Error while getting getAllUsers ${error}`)
		return res
			.status(constants.STATUS_CODE.INTERNAL_SERVER_ERROR_STATUS)
			.send({ msg: error.message })
	}
}