import { awardReferrerOnPayment, saveUserWithReferral } from './referral.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    addDoc,
    updateDoc,
    getDoc,
    query,
    onSnapshot, // ✅ Keep only ONE onSnapshot import
    collection,
    where,
    getDocs,
    Timestamp,
    increment,
    limit,
    serverTimestamp,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-storage.js";

// ✅ Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyB02cxufKS4zKNDMgCH3Ejs0XnxCpFrwlI",
    authDomain: "emax-delivery.firebaseapp.com",
    projectId: "emax-delivery",
    storageBucket: "emax-delivery.appspot.com",
    messagingSenderId: "1019832200294",
    appId: "1:1019832200294:web:662c92010b39f7d86151a7",
    measurementId: "G-3EXL7TP2LX"
};

// ✅ Initialize Firebase Services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export {
    auth,
    db,
    doc,
    getDoc,
    addDoc,
    updateDoc,
    query,
    collection,
    where,
    getDocs,
    increment,
    setDoc,
    onSnapshot,
    getFirestore,
    onAuthStateChanged,
    storage,
    arrayUnion,
    limit,
    serverTimestamp
};

// Ensure user is authenticated
export const ensureAuthenticated = () => {
    const userEmail = localStorage.getItem("userEmail");

    if (!userEmail) {
        window.location.href = "/"; 
    } else {
        console.log("User is authenticated");
    }
};


// DOM Content Loaded Event Listener
document.addEventListener("DOMContentLoaded", () => {
    const loginSection = document.getElementById("login-section");
    const signupSection = document.getElementById("signup-section");
    const forgotPasswordSection = document.getElementById("forgot-password-section");
    
    const loginMessage = document.getElementById("login-message");
    const signupMessage = document.getElementById("signup-message");

    const showSignupButton = document.getElementById("show-signup");
    const showLoginButton = document.getElementById("show-login");
    const forgotPasswordButton = document.getElementById("forgot-password");
    const backToLoginButton = document.getElementById("back-to-login");

    // Ensure Signup is Visible by Default
    signupSection.classList.remove("hidden");
    loginSection.classList.add("hidden");
    forgotPasswordSection.classList.add("hidden");

    // Password toggle functionality
    const togglePasswordVisibility = (inputId, toggleId) => {
        const input = document.getElementById(inputId);
        const toggleIcon = document.getElementById(toggleId);
        if (input && toggleIcon) {
            toggleIcon.addEventListener("click", () => {
                const type = input.type === "password" ? "text" : "password";
                input.type = type;
                toggleIcon.classList.toggle("fa-eye");
                toggleIcon.classList.toggle("fa-eye-slash");
            });
        }
    };

    togglePasswordVisibility("login-password", "toggle-login-password");
    togglePasswordVisibility("signup-password", "toggle-signup-password");
    togglePasswordVisibility("confirm-password", "toggle-confirm-password");

    // Toggle Between Signup and Login Sections
    if (showSignupButton) {
        showSignupButton.addEventListener("click", () => {
            loginSection.classList.add("hidden");
            forgotPasswordSection.classList.add("hidden");
            signupSection.classList.remove("hidden");
        });
    }

    if (showLoginButton) {
        showLoginButton.addEventListener("click", () => {
            signupSection.classList.add("hidden");
            forgotPasswordSection.classList.add("hidden");
            loginSection.classList.remove("hidden");
        });
    }

    // Show Forgot Password Section
    if (forgotPasswordButton) {
        forgotPasswordButton.addEventListener("click", () => {
            loginSection.classList.add("hidden");
            signupSection.classList.add("hidden");
            forgotPasswordSection.classList.remove("hidden");
        });
    }

    // Back to Login from Forgot Password
    if (backToLoginButton) {
        backToLoginButton.addEventListener("click", () => {
            forgotPasswordSection.classList.add("hidden");
            signupSection.classList.add("hidden");
            loginSection.classList.remove("hidden");
        });
    }

    // Login Form Submission
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("login-email").value.trim();
            const password = document.getElementById("login-password").value.trim();

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                if (user) {
                    localStorage.setItem("userEmail", email);
                    // Redirect to dashboard after login
                    window.location.href = "/dashboard";
                }
            } catch (error) {
                if (loginMessage) {
                    loginMessage.textContent = error.message;
                    loginMessage.classList.add("error");
                }
            }
        });
    }

// Function to Extract Referral Code from URL
function getReferralCodeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("ref") || null;
}

// Function to Handle Signup Form Submission
const signupForm = document.getElementById("signup-form");
if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const firstName = document.getElementById("first-name").value.trim();
        const lastName = document.getElementById("last-name").value.trim();
        const email = document.getElementById("signup-email").value.trim();
        const password = document.getElementById("signup-password").value.trim();
        const confirmPassword = document.getElementById("confirm-password").value.trim();
        let referralCode = document.getElementById("referral-code").value.trim();

        // Auto-fill referral code if found in URL
        if (!referralCode) {
            referralCode = getReferralCodeFromURL();
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        try {
            // Create user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            if (user) {
                const userId = user.uid;
                const referralLink = `${window.location.origin}/?ref=${userId}`;
                
                // Validate Referral Code (Ensure it exists in Firestore)
                let validReferrerId = null;
                if (referralCode) {
                    const referrerRef = doc(db, "users", referralCode);
                    const referrerDoc = await getDoc(referrerRef);
                    if (referrerDoc.exists()) {
                        validReferrerId = referralCode;
                        // Increase total referrals for the referrer
                        await updateDoc(referrerRef, { totalReferrals: increment(1) });
                    } else {
                        console.warn(`Invalid referral code: ${referralCode}`);
                    }
                }

                // Save user in Firestore
                await setDoc(doc(db, "users", userId), {
                    firstName,
                    lastName,
                    email,
                    referralCode: validReferrerId, // Save only if valid
                    referralLink,
                    amountPaid: 0,
                    totalEarnings: 0,
                    totalReferrals: 0,
                    membershipPaid: false,
                    membershipApproved: false,
                    paymentApproved: false,
                    validatorRequest: false,
                   // videoEarnings,
                    //likedVideos,
                    //watchedVideos,
                    registeredAt: new Date(), 
                });

                console.log("User signed up successfully:", userId);
                window.location.href = "/dashboard";
            }
        } catch (error) {
            console.error("Signup Error:", error.message);
            alert(error.message);
        }
    });
}

    // Forgot Password Form Submission
    const resetPasswordButton = document.getElementById("send-reset-email");
    if (resetPasswordButton) {
        resetPasswordButton.addEventListener("click", async () => {
            const resetEmail = document.getElementById("reset-email").value.trim();
            const resetMessage = document.getElementById("reset-message");

            if (!resetEmail) {
                resetMessage.textContent = "Please enter a valid email.";
                return;
            }

            try {
                await sendPasswordResetEmail(auth, resetEmail);
                resetMessage.textContent = "Reset link sent! Check your email.";
                resetMessage.classList.add("text-green-500");
            } catch (error) {
                resetMessage.textContent = error.message;
                resetMessage.classList.add("text-red-500");
            }
        });
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const hamburgerIcon = document.getElementById("hamburger-icon");
    const closeNav = document.getElementById("close-nav");
    const mobileNav = document.getElementById("mobile-nav");
    const overlay = document.getElementById("overlay");

    // Check if elements exist before adding event listeners
    if (!hamburgerIcon || !closeNav || !mobileNav || !overlay) {
        console.warn("Navigation elements not found. Skipping mobile nav setup.");
        return;
    }

    // Function to open mobile navigation
    const openNav = () => {
        mobileNav.classList.remove("-translate-x-full");
        overlay.classList.remove("hidden");
    };

    // Function to close mobile navigation
    const closeMobileNav = () => {
        mobileNav.classList.add("-translate-x-full");
        overlay.classList.add("hidden");
    };

    // Event Listeners
    hamburgerIcon.addEventListener("click", openNav);
    closeNav.addEventListener("click", closeMobileNav);
    overlay.addEventListener("click", closeMobileNav);
});
