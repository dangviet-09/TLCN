const authRouter = require('./authRoute')
const userRouter = require('./userRoute')
const blogRouter = require('./blogRoute')
const careerTestRouter = require('./careerTestRoute');
const challengeTestRouter = require('./challengeTestRoute');
const studentRouter = require('./studentRoute')
const commentRouter = require('./commentRoute');
const likeRouter = require('./likeRoute');
const careerPathRouter = require('./careerPathRoute');
const lessonRouter = require('./lessonRoute');
const testRouter = require('./testRoute');
const conversationRouter = require('./conversationRoute');
const notificationRouter = require('./notificationRoute');
const companyRouter = require('./companyRoute');
const chatRouter = require('./chatRoute');
const searchRouter = require('./searchRoute');
const followRouter = require('./followRoute');
const vectorRouter = require('./vectorRoute');
const courseRouter = require('./courseRoute');
const jobRouter = require('./jobRoute');

const uploadRouter = require('./uploadRoute');

function route(app) {
    // Health check endpoint for Docker
    app.get("/health", (req, res) => {
        res.status(200).json({
            status: "OK",
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    });

    app.use("/auth",authRouter)
    app.use("/users",userRouter)
    app.use("/blogs",blogRouter)
    app.use("/career-tests", careerTestRouter);
    app.use("/challenge-tests", challengeTestRouter)
    app.use("/comments", commentRouter)
    app.use("/likes", likeRouter);
    app.use("/students", studentRouter)  
    app.use("/career-paths", careerPathRouter); 
    app.use("/lessons", lessonRouter);
    app.use("/tests", testRouter);
    app.use("/conversations", conversationRouter);
    app.use("/notifications", notificationRouter);
    app.use("/companies", companyRouter);
    app.use("/chat", chatRouter);
    app.use("/search", searchRouter);
    app.use("/follows", followRouter);
    app.use("/vector", vectorRouter);
    app.use("/courses", courseRouter);
    app.use("/jobs", jobRouter);
    app.use("/upload", uploadRouter);
}

module.exports = route;