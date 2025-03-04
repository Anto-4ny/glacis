import { auth, db, doc, getDoc, updateDoc, query, collection, where, getDocs, increment, setDoc, onAuthStateChanged } from './script.js';

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM fully loaded");

    onAuthStateChanged(auth, async (user) => {
        console.log("Checking authentication state...");

        if (user) {
            console.log("User logged in:", user.uid);

            const userDoc = await waitForUserDocument(user.uid);
            if (!userDoc) {
                console.error("User document does not exist in Firestore.");
                return;
            }

            console.log("User document found:", userDoc.data());
            displayReferralLink(user.uid);
            await loadReferredUsers(user.uid);
        } else {
            console.log("No user is logged in.");

            if (window.location.pathname !== "/" && window.location.pathname !== "/index") {
                window.location.href = "/"; // Redirect to sign-up page
            }
        }
    });

    // Auto-fill referral code from URL if present
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
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 sec
        userDoc = await getDoc(userRef);
        attempts++;
    }

    return userDoc.exists() ? userDoc : null;
}

// Display Referral Link
function displayReferralLink(userId) {
    const referralLinkElement = document.getElementById("referral-link");
    const copyButton = document.getElementById("copy-link-button");
    const whatsappButton = document.getElementById("whatsapp-share-button");

    if (!referralLinkElement || !copyButton || !whatsappButton) {
        console.error("One or more referral elements are missing!");
        return;
    }

    const referralLink = `${window.location.origin}/?ref=${userId}`;
    referralLinkElement.textContent = referralLink;

    copyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(referralLink);
        alert("Referral link copied!");
    });

    whatsappButton.href = `https://wa.me/?text=Join%20now%20using%20my%20referral%20link:%20${encodeURIComponent(referralLink)}`;
}

// Load Referred Users
async function loadReferredUsers(referrerId) {
    if (!referrerId) return;

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
                <td class="p-3">${userData.paymentStatus ? "Paid" : "Unpaid"}</td>
            </tr>
        `;
    });
}

// Save New User with Referral Code
async function saveUserWithReferral(userId, email, referrerId) {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
        email,
        referralCode: referrerId || null,
        paymentStatus: false,
        totalReferrals: 0,
        totalEarnings: 0
    }, { merge: true });

    console.log(`User ${userId} registered with referrer: ${referrerId}`);

    if (referrerId) {
        await loadReferredUsers(referrerId);
    }
}

// Award Referrer on Payment
async function awardReferrerOnPayment(userId) {
    if (!userId) return;

    const userDoc = await waitForUserDocument(userId);
    if (!userDoc) {
        console.warn(`User document not found for ID: ${userId}`);
        return;
    }

    const referrerId = userDoc.data().referralCode;
    if (!referrerId) {
        console.log(`User ${userId} was not referred by anyone.`);
        return;
    }

    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { paymentStatus: true });

    const referrerRef = doc(db, "users", referrerId);
    const referrerDoc = await getDoc(referrerRef);

    if (referrerDoc.exists()) {
        console.log(`Awarding referrer ${referrerId} with +10 earnings`);
        await updateDoc(referrerRef, { totalEarnings: increment(10) });

        const grandReferrerId = referrerDoc.data().referralCode;
        if (grandReferrerId) {
            console.log(`Awarding grand referrer ${grandReferrerId} with +5 earnings`);
            const grandReferrerRef = doc(db, "users", grandReferrerId);
            await updateDoc(grandReferrerRef, { totalEarnings: increment(5) });
        }
    } else {
        console.warn(`Referrer document not found for ID: ${referrerId}`);
    }
}

export { awardReferrerOnPayment };
