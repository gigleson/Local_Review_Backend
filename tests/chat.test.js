import chai from "chai";
import chaiHttp from "chai-http";
import app from "../server.js";
import { User } from "../models/user.model.js";
import { Post } from "../models/post.model.js";
import { Comment } from "../models/comment.model.js";
import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

const { expect } = chai;
chai.use(chaiHttp);

describe("Post API Tests", () => {
    let user, token, post;

    before(async () => {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        user = await User.create({
            username: "testuser",
            email: "test@example.com",
            password: "password123",
        });
        token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, { expiresIn: "1d" });
    });

    after(async () => {
        await mongoose.connection.close();
    });

    it("should add a new post", async () => {
        const res = await chai.request(app)
            .post("/api/posts")
            .set("Authorization", `Bearer ${token}`)
            .field("caption", "Test Post")
            .attach("image", Buffer.from("testimage"), "test.jpg");
        
        expect(res).to.have.status(201);
        expect(res.body).to.have.property("success", true);
        post = res.body.post;
    });

    it("should get all posts", async () => {
        const res = await chai.request(app).get("/api/posts");
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("success", true);
        expect(res.body.posts).to.be.an("array");
    });

    it("should like a post", async () => {
        const res = await chai.request(app)
            .post(`/api/posts/${post._id}/like`)
            .set("Authorization", `Bearer ${token}`);
        
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("message", "Post liked");
    });

    it("should dislike a post", async () => {
        const res = await chai.request(app)
            .post(`/api/posts/${post._id}/dislike`)
            .set("Authorization", `Bearer ${token}`);
        
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("message", "Post disliked");
    });

    it("should add a comment to a post", async () => {
        const res = await chai.request(app)
            .post(`/api/posts/${post._id}/comment`)
            .set("Authorization", `Bearer ${token}`)
            .send({ text: "Great post!" });
        
        expect(res).to.have.status(201);
        expect(res.body).to.have.property("success", true);
    });

    it("should delete a post", async () => {
        const res = await chai.request(app)
            .delete(`/api/posts/${post._id}`)
            .set("Authorization", `Bearer ${token}`);
        
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("message", "Post deleted");
    });
});

describe("Chat API Tests", () => {
    let user2, token2;

    before(async () => {
        user2 = await User.create({
            username: "testuser2",
            email: "test2@example.com",
            password: "password123",
        });
        token2 = jwt.sign({ id: user2._id }, process.env.SECRET_KEY, { expiresIn: "1d" });
    });

    it("should send a message", async () => {
        const res = await chai.request(app)
            .post(`/api/chat/${user2._id}/send`)
            .set("Authorization", `Bearer ${token}`)
            .send({ textMessage: "Hello!" });
        
        expect(res).to.have.status(201);
        expect(res.body).to.have.property("success", true);
        expect(res.body.newMessage).to.have.property("message", "Hello!");
    });

    it("should get messages between users", async () => {
        const res = await chai.request(app)
            .get(`/api/chat/${user2._id}/messages`)
            .set("Authorization", `Bearer ${token}`);
        
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("success", true);
        expect(res.body.messages).to.be.an("array");
    });
});