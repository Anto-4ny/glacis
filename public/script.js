import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
    getFirestore,
    doc,
    setDoc,
    addDoc,
    updateDoc,
    getDoc,
    query,
    onSnapshot,
    collection,
    where,
    getDocs,
    Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyB7t1wWHhPYBitqKC4SJ8lqP1WMLDefCxo",
    authDomain: "antocap-referrals.firebaseapp.com",
    projectId: "antocap-referrals",
    storageBucket: "antocap-referrals.appspot.com",
    messagingSenderId: "1071760453747",
    appId: "1:1071760453747:web:fafa7ac624ba7452e6fa06",
    measurementId: "G-EPLJB8MTRH",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // ✅ Correct way to get auth
const db = getFirestore(app);
const storage = getStorage(app);

// Export Firebase modules
export { auth, db, sendPasswordResetEmail };

// Ensure user is authenticated
export const ensureAuthenticated = () => {
    const userEmail = localStorage.getItem("userEmail");

    if (!userEmail) {
        window.location.href = "/"; // Redirect to login page (adjust URL if necessary)
    } else {
        console.log("User is authenticated");
    }
};


// DOM Content Loaded Event Listener
document.addEventListener("DOMContentLoaded", () => {
    const loginSection = document.getElementById("login-section");
    const signupSection = document.getElementById("signup-section");
    const loginMessage = document.getElementById("login-message");
    const signupMessage = document.getElementById("signup-message");

    const showSignupButton = document.getElementById("show-signup");
    const showLoginButton = document.getElementById("show-login");

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

    if (showSignupButton) {
        showSignupButton.addEventListener("click", () => {
            loginSection.classList.add("hidden");
            signupSection.classList.remove("hidden");
        });
    }

    if (showLoginButton) {
        showLoginButton.addEventListener("click", () => {
            signupSection.classList.add("hidden");
            loginSection.classList.remove("hidden");
        });
    }

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

    const signupForm = document.getElementById("signup-form");
    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const firstName = document.getElementById("first-name").value.trim();
            const lastName = document.getElementById("last-name").value.trim();
            const email = document.getElementById("signup-email").value.trim();
            const password = document.getElementById("signup-password").value.trim();
            const confirmPassword = document.getElementById("confirm-password").value.trim();
            const referralCode = document.getElementById("referral-code").value.trim();

            if (password !== confirmPassword) {
                if (signupMessage) {
                    signupMessage.textContent = "Passwords do not match.";
                    signupMessage.classList.add("error");
                }
                return;
            }

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                if (user) {
                    // Generate unique referral link
                    const referralLink = `${window.location.origin}/?ref=${user.uid}`;

                    // Save user data to Firestore
                    await setDoc(doc(db, "users", user.uid), {
                        firstName,
                        lastName,
                        email,
                        referralCode,
                        referralLink,
                        paymentStatus: false,
                        amountPaid: 0,
                        totalEarnings: 0,
                        totalReferrals: 0,
                        totalViews: 0,
                        registeredAt: new Date(),
                    });

                    // Redirect to dashboard
                    window.location.href = "dashboard";
                }
            } catch (error) {
                if (signupMessage) {
                    signupMessage.textContent = error.message;
                    signupMessage.classList.add("error");
                }
            }
        });
    }
});


// Display referral link and handle sharing
const referralLinkElement = document.getElementById("referral-link");
const copyButton = document.getElementById("copy-link-button");
const whatsappShareButton = document.getElementById("whatsapp-share-button");

const displayReferralLink = (referralLink) => {
    if (referralLinkElement) {
        referralLinkElement.textContent = referralLink;

        if (copyButton) {
            copyButton.addEventListener("click", () => {
                navigator.clipboard
                    .writeText(referralLink)
                    .then(() => alert("Referral link copied to clipboard!"))
                    .catch(() => alert("Failed to copy referral link."));
            });
        }

        if (whatsappShareButton) {
            whatsappShareButton.href = `https://wa.me/?text=Lets Earn Together Buddy: ${referralLink}`;
        }
    }
};

// Load referral link from Firestore if logged in
const loadReferralLink = async () => {
    const userEmail = localStorage.getItem("userEmail");
    if (userEmail) {
        const q = query(collection(db, "users"), where("email", "==", userEmail));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const referralLink = userDoc.data().referralLink;
            displayReferralLink(referralLink);
        }
    }
};

loadReferralLink();

// Function to check user's payment status
const checkAuthenticationAndPayment = async () => {
    const userEmail = localStorage.getItem("userEmail");

    if (!userEmail) {
        // Redirect to login if no email is found in localStorage
        if (!window.location.pathname.includes("/")) {
            window.location.href = "/";
        }
        return;
    }

    try {
        const q = query(collection(db, "users"), where("email", "==", userEmail));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            if (userData.paymentStatus) {
                console.log("You have paid.");
                localStorage.setItem("paymentStatus", "paid");
            } else {
                console.log("You have not paid. Redirecting to payment pop-up...");
                localStorage.setItem("paymentStatus", "not-paid");
                if (!window.location.pathname.includes("dashboard")) {
                    window.location.href = "dashboard";
                }
            }
        } else {
            console.error("User document not found.");
        }
    } catch (error) {
        console.error("Error checking payment status:", error);
    }
};

// Ensure user authentication and handle payment status
auth.onAuthStateChanged(async (user) => {
    if (user) {
        localStorage.setItem("userEmail", user.email);
        await checkAuthenticationAndPayment();
    } else {
        if (!window.location.pathname.includes("/")) {
            window.location.href = "/";
        }
    }
});

document.addEventListener("DOMContentLoaded", () => {
  const hamburgerIcon = document.getElementById("hamburger-icon");
  const closeNav = document.getElementById("close-nav");
  const mobileNav = document.getElementById("mobile-nav");
  const overlay = document.getElementById("overlay");

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
