require("dotenv").config();

const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static("../"));

const PORT = process.env.PORT || 3000;

const consumerKey = process.env.CONSUMER_KEY;
const consumerSecret = process.env.CONSUMER_SECRET;


// Get Daraja access token
async function getAccessToken() {

    const credentials =
        Buffer
            .from(
                consumerKey + ":" + consumerSecret
            )
            .toString("base64");


    const response =
        await axios.get(
            "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            {
                headers: {
                    Authorization:
                        "Basic " + credentials
                }
            }
        );


    return response.data.access_token;
}


// Test access-token endpoint
app.get("/api/token-test", async function (req, res) {

    try {

        const token =
            await getAccessToken();


        res.json({
            success: true,
            message: "Daraja connection successful.",
            tokenReceived: !!token
        });


    } catch (error) {

        console.error(
            error.response?.data || error.message
        );


        res.status(500).json({
            success: false,
            message: "Could not connect to Daraja."
        });

    }

});

app.post("/api/stkpush", async function (req, res) {

    try {

        const accessToken = await getAccessToken();

        const timestamp = new Date()
            .toISOString()
            .replace(/[-:TZ.]/g, "")
            .slice(0, 14);

        const password = Buffer
            .from(
                process.env.MPESA_SHORTCODE +
                process.env.MPESA_PASSKEY +
                timestamp
            )
            .toString("base64");

        const response = await axios.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            {
                BusinessShortCode: process.env.MPESA_SHORTCODE,
                Password: password,
                Timestamp: timestamp,
                TransactionType: "CustomerPayBillOnline",
                Amount: req.body.amount,
                PartyA: req.body.phone,
                PartyB: process.env.MPESA_SHORTCODE,
                PhoneNumber: req.body.phone,
                CallBackURL: process.env.CALLBACK_URL,
                AccountReference: "SHARPTIPS",
                TransactionDesc: "Premium Tip"
            },
            {
                headers: {
                    Authorization: "Bearer " + accessToken,
                    "Content-Type": "application/json"
                }
            }
        );
if (response.data.ResponseCode === "0") {

    pendingPayments[
        response.data.CheckoutRequestID
    ] = {
        tipId: req.body.tipId,
        email: req.body.email
    };

}
        res.json(response.data);

    } catch (error) {

        console.error(error.response?.data || error.message);

        res.status(500).json({
            success: false,
            message: "STK Push failed.",
            error: error.response?.data || error.message
        });

    }

});
const pendingPayments = {};
app.post("/api/stkpush/callback", function (req, res) {

    console.log("M-Pesa Callback Received:");

    const callback = req.body?.Body?.stkCallback;

    if (!callback) {

        console.log("Invalid callback received.");

        return res.status(400).json({
            ResultCode: 1,
            ResultDesc: "Invalid callback"
        });

    }

    console.log(
        "CheckoutRequestID:",
        callback.CheckoutRequestID
    );

    console.log(
        "ResultCode:",
        callback.ResultCode
    );

    console.log(
        "ResultDesc:",
        callback.ResultDesc
    );

    if (callback.ResultCode === 0) {

        console.log("PAYMENT SUCCESSFUL");

        const payment =
            pendingPayments[
                callback.CheckoutRequestID
            ];

        if (payment) {

            console.log(
                "Tip ID:",
                payment.tipId
            );

            console.log(
                "Customer:",
                payment.email
            );

            console.log(
                "Premium access granted."
            );

            pendingPayments[
                callback.CheckoutRequestID
            ].paid = true;

        } else {

            console.log(
                "Payment record not found."
            );

        }

    } else {

        console.log(
            "PAYMENT NOT COMPLETED"
        );

    }

    res.json({
        ResultCode: 0,
        ResultDesc: "Callback received successfully"
    });

});


app.get("/api/payment-status", function (req, res) {

    const email = req.query.email;
    const tipId = req.query.tipId;

    if (!email || !tipId) {

        return res.json({
            purchased: false
        });

    }

    for (const checkoutId in pendingPayments) {

        const payment =
            pendingPayments[checkoutId];

        if (
            payment.email === email &&
            String(payment.tipId) === String(tipId) &&
            payment.paid === true
        ) {

            return res.json({
                purchased: true
            });

        }

    }

    res.json({
        purchased: false
    });

});

app.get("/", function (req, res) {

    res.send(
        "SHARPTIPS payment server is running."
    );

});


app.listen(PORT, function () {

    console.log(
        "SHARPTIPS server running on port " + PORT
    );

});
