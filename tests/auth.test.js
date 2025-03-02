import chai from "chai";
import chaiHttp from "chai-http";
import app from "../server.js"; // Adjust the import based on your project structure
import { User } from "../models/user.model.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

const { expect } = chai;
chai.use(chaiHttp);

const API_PREFIX = "/api/auth"; // Adjust if necessary

describe("Auth API Tests", () => {
    let testUser;
    let token;

    before(async () => {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });

    beforeEach(async () => {
        const hashedPassword = await bcrypt.hash("testpassword", 10);
        testUser = await User.create({
            username: "testuser",
            email: "test@example.com",
            password: hashedPassword,
        });

        token = jwt.sign({ userId: testUser._id }, process.env.SECRET_KEY, { expiresIn: "1d" });
    });

    afterEach(async () => {
        await User.deleteMany();
    });

    after(async () => {
        await mongoose.connection.close();
    });

    it("should register a new user", async () => {
        const res = await chai.request(app)
            .post(`${API_PREFIX}/register`)
            .send({
                username: "newuser",
                email: "newuser@example.com",
                password: "password123",
            });

        expect(res).to.have.status(201);
        expect(res.body).to.have.property("success", true);
        expect(res.body).to.have.property("message", "Account created successfully.");
    });

    it("should fail to register with missing fields", async () => {
        const res = await chai.request(app)
            .post(`${API_PREFIX}/register`)
            .send({ email: "newuser@example.com" });

        expect(res).to.have.status(401);
        expect(res.body).to.have.property("success", false);
    });

    it("should login with valid credentials", async () => {
        const res = await chai.request(app)
            .post(`${API_PREFIX}/login`)
            .send({
                email: "test@example.com",
                password: "testpassword",
            });

        expect(res).to.have.status(200);
        expect(res.body).to.have.property("success", true);
        expect(res.body.user.email).to.equal("test@example.com");
        expect(res).to.have.cookie("token");
    });

    it("should fail login with incorrect password", async () => {
        const res = await chai.request(app)
            .post(`${API_PREFIX}/login`)
            .send({
                email: "test@example.com",
                password: "wrongpassword",
            });

        expect(res).to.have.status(401);
        expect(res.body).to.have.property("success", false);
        expect(res.body).to.have.property("message", "Incorrect email or password");
    });

    it("should get profile of existing user", async () => {
        const res = await chai.request(app)
            .get(`${API_PREFIX}/profile/${testUser._id}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res).to.have.status(200);
        expect(res.body).to.have.property("success", true);
        expect(res.body.user.email).to.equal(testUser.email);
    });

    it("should edit profile", async () => {
        const res = await chai.request(app)
            .put(`${API_PREFIX}/profile/edit`)
            .set("Authorization", `Bearer ${token}`)
            .send({
                bio: "Updated bio",
                gender: "Male",
            });

        expect(res).to.have.status(200);
        expect(res.body).to.have.property("success", true);
        expect(res.body.user.bio).to.equal("Updated bio");
    });

    it("should logout user", async () => {
        const res = await chai.request(app)
            .post(`${API_PREFIX}/logout`);

        expect(res).to.have.status(200);
        expect(res.body).to.have.property("success", true);
        expect(res.body).to.have.property("message", "Logged out successfully.");
    });

    it("should get suggested users", async () => {
        const res = await chai.request(app)
            .get(`${API_PREFIX}/suggested-users`)
            .set("Authorization", `Bearer ${token}`);

        expect(res).to.have.status(200);
        expect(res.body).to.have.property("success", true);
    });

    it("should follow and unfollow a user", async () => {
        const anotherUser = await User.create({
            username: "otheruser",
            email: "otheruser@example.com",
            password: await bcrypt.hash("testpassword", 10),
        });

        const followRes = await chai.request(app)
            .post(`${API_PREFIX}/follow/${anotherUser._id}`)
            .set("Authorization", `Bearer ${token}`);

        expect(followRes).to.have.status(200);
        expect(followRes.body).to.have.property("message", "followed successfully");

        const unfollowRes = await chai.request(app)
            .post(`${API_PREFIX}/follow/${anotherUser._id}`)
            .set("Authorization", `Bearer ${token}`);

        expect(unfollowRes).to.have.status(200);
        expect(unfollowRes.body).to.have.property("message", "Unfollowed successfully");
    });
});
