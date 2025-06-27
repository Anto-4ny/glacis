import { auth, db, doc, getDoc, updateDoc, query, collection, where, getDocs, increment, setDoc, limit, onAuthStateChanged } from './script.js';

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Page loaded");

    const currentPath = window.location.pathname;
    const isDashboard = currentPath.includes("dashboard");

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("User logged in:", user.uid);

            const userDoc = await waitForUserDocument(user.uid);
            if (!userDoc) {
                console.error("User document not found.");
                return;
            }

            console.log("User document data:", userDoc.data());

            // Restrict dashboard access
            if (isDashboard) {
                console.log("Dashboard detected, running dashboard scripts...");
                //checkPaymentStatus(user.uid);
                loadReferredUsers(user.uid);
            }

            // Referral link should always display (all pages)
            displayReferralLink(user.uid);
        } else {
            console.log("No user is logged in.");
            
            if (isDashboard) {
                window.location.href = "/"; // Redirect ONLY if on dashboard
            }
        }
    });

    // Auto-fill referral code from URL if present (all pages)
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get("ref");
    if (refCode) {
        const referralCodeInput = document.getElementById("referral-code");
        if (referralCodeInput) {
            referralCodeInput.value = refCode;
        } else {
            console.error("Referral code input field not found!");
        }
    }
});

// Wait for Firestore to create user document
async function waitForUserDocument(userId) {
    const userRef = doc(db, "users", userId);
    let userDoc = await getDoc(userRef);

    let attempts = 0;
    while (!userDoc.exists() && attempts < 5) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        userDoc = await getDoc(userRef);
        attempts++;
    }
    return userDoc.exists() ? userDoc : null;
}


// Display Referral Link (All Pages)
function displayReferralLink(userId) {
    console.log("Displaying referral link for user:", userId);

    const referralLinkElement = document.getElementById("referral-link");
    const copyButton = document.getElementById("copy-link-button");
    const whatsappButton = document.getElementById("whatsapp-share-button");
    const messageContainer = document.getElementById("copy-message"); // UI message element

    if (!referralLinkElement || !copyButton || !whatsappButton || !messageContainer) {
        console.error("One or more referral elements are missing!");
        return;
    }

    const referralLink = `${window.location.origin}/?ref=${userId}`;
    referralLinkElement.textContent = referralLink;

    copyButton.addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(referralLink);
            showMessage("Referral link copied!", "success");
        } catch (error) {
            console.error("Copy failed:", error);
            showMessage("Failed to copy link!", "error");
        }
    });

    whatsappButton.href = `https://wa.me/?text=Join%20now%20using%20my%20referral%20link:%20${encodeURIComponent(referralLink)}`;
}

// Function to show success/error message in the UI
function showMessage(message, type) {
    const messageContainer = document.getElementById("copy-message");
    messageContainer.textContent = message;

    if (type === "success") {
        messageContainer.className = "text-green-600 font-semibold mt-2";
    } else {
        messageContainer.className = "text-red-600 font-semibold mt-2";
    }

    messageContainer.style.display = "block";
    
    // Hide message after 3 seconds
    setTimeout(() => {
        messageContainer.style.display = "none";
    }, 3000);
}

// Load Referred Users (Only on Dashboard)
async function loadReferredUsers(referrerId) {
    if (!referrerId) return;

    console.log("Loading referred users for:", referrerId);

    const referredUsersList = document.getElementById("referred-users-list");
    if (!referredUsersList) return;

    referredUsersList.innerHTML = ""; // Clear list

    const usersQuery = query(collection(db, "users"), where("referralCode", "==", referrerId));
    const querySnapshot = await getDocs(usersQuery);

    querySnapshot.forEach((doc) => {
        const userData = doc.data();
        referredUsersList.innerHTML += `
            <tr class="border-b border-gray-600">
                <td class="p-3">${userData.email}</td>
                <td class="p-3">${userData.isVvalidator ? "Member" : "Not-a-Member"}</td>
            </tr>
        `;
    });
}

// Save New User with Referral Code
async function saveUserWithReferral(userId, email, referrerId) {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
        firstName: "",
        lastName: "",
        email,
        referralCode: referrerId || null,
        referralLink: `${window.location.origin}/?ref=${userId}`,
        amountPaid: 0,
        totalReferrals: 0,
        totalEarnings: 0,
        referralEarnings: 0,
        likedVideos: 0,
        watchedVideos: 0,
        isValidator: false,
        isVvalidator: false,
        registeredAt: new Date(),
    }, { merge: true });

    console.log(`User ${userId} registered with referrer: ${referrerId}`);

    if (referrerId) {
        await updateDoc(doc(db, "users", referrerId), { totalReferrals: increment(1) });
        await loadReferredUsers(referrerId);
    }
}

// Award Referral Earnings with Updated Conditions
async function awardReferrerOnPayment(userId) {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
        console.log(`User ${userId} not found.`);
        return;
    }

    const userData = userDoc.data();

    // Proceed if user is either a validator or vvalidator
    if (!userData.isValidator && !userData.isVvalidator) {
        console.log(`User ${userId} is neither a validator nor vvalidator.`);
        return;
    }

    // Fetch payments with approved-admin in either 'status' or 'statuss'
    const paymentsQuery = query(
        collection(db, "payments"),
        where("email", "==", userData.email)
    );
    const paymentsSnapshot = await getDocs(paymentsQuery);

    let hasApprovedPayment = false;
    paymentsSnapshot.forEach((doc) => {
        const payment = doc.data();
        if (payment.status === "approved-admin" || payment.statuss === "approved-admin") {
            hasApprovedPayment = true;
        }
    });

    if (!hasApprovedPayment) {
        console.log(`No approved payment found for ${userData.email}.`);
        return;
    }

    // If all conditions are met, award the referrer
    const referrerId = userData.referralCode;
    if (!referrerId) {
        console.log(`User ${userId} has no referrer.`);
        return;
    }

    const referrerRef = doc(db, "users", referrerId);
    await updateDoc(referrerRef, { totalEarnings: increment(2.5) });
    console.log(`Referrer ${referrerId} earned +2.5.`);

    // Award grand referrer if available
    const referrerDoc = await getDoc(referrerRef);
    const grandReferrerId = referrerDoc.exists() ? referrerDoc.data().referralCode : null;
    
    if (grandReferrerId) {
        const grandReferrerRef = doc(db, "users", grandReferrerId);
        await updateDoc(grandReferrerRef, { totalEarnings: increment(0.5) });
        console.log(`Grand referrer ${grandReferrerId} earned +0.5.`);
    }
}


export { awardReferrerOnPayment, saveUserWithReferral };
