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
                checkPaymentStatus(user.uid);
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

// Check Payment Status & Hide Pop-Up (Only on Dashboard)
async function checkPaymentStatus(userId) {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    const paymentPopup = document.getElementById("payment-popup");

    if (!paymentPopup) {
        console.log("⚠️ Payment pop-up not found in DOM.");
        return;
    }

    if (!userDoc.exists()) {
        console.log("⚠️ User document not found.");
        return;
    }

    const userData = userDoc.data();
    console.log("🔍 Checking user details:", userData);

    // ✅ Fetch latest payment record for the user
    const paymentsQuery = query(
        collection(db, "payments"),
        where("email", "==", userData.email),
        where("type", "==", "membership"),
        //orderBy("timestamp", "desc"),
        limit(1)
    );

    const paymentSnap = await getDocs(paymentsQuery);

    if (!paymentSnap.empty) {
        const paymentDoc = paymentSnap.docs[0];
        const paymentData = paymentDoc.data();
        console.log("🔍 Checking latest payment:", paymentData);

        if (paymentData.paymentApproved === "approved") {
            console.log("✅ Payment verified. Hiding pop-up.");

            // ✅ Update user membership approval
            await updateDoc(userRef, { membershipApproved: true });

            // ✅ Hide pop-up
            paymentPopup.style.opacity = "0";
            paymentPopup.style.pointerEvents = "none";
            paymentPopup.style.display = "none";
            paymentPopup.classList.remove("flex");
            paymentPopup.classList.add("hidden");
        } else {
            console.log("🚨 Payment not approved. Ensuring pop-up is visible.");
            paymentPopup.style.opacity = "1";
            paymentPopup.style.pointerEvents = "auto";
            paymentPopup.style.display = "flex";
            paymentPopup.classList.remove("hidden");
        }
    } else {
        console.log("⚠️ No payment found. Pop-up remains visible.");
        paymentPopup.style.opacity = "1";
        paymentPopup.style.pointerEvents = "auto";
        paymentPopup.style.display = "flex";
        paymentPopup.classList.remove("hidden");
    }
}

// Display Referral Link (All Pages)
function displayReferralLink(userId) {
    console.log("Displaying referral link for user:", userId);

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
                <td class="p-3">${userData.paymentStatus ? "Paid" : "Unpaid"}</td>
            </tr>
        `;
    });
}

// Save New User with Referral Code
async function saveUserWithReferral(userId, email, referrerId) {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, {
        firstName,
        lastName,
        email,
        referralCode: referrerId || null,
        referralLink,
        amountPaid: 0,
        totalReferrals: 0,
        totalEarnings: 0,
        membershipApproved: false,
        //videoEarnings,
       // likedVideos,
       // watchedVideos,
        registeredAt: new Date(),
    }, { merge: true });

    console.log(`User ${userId} registered with referrer: ${referrerId}`);

    if (referrerId) {
        await updateDoc(doc(db, "users", referrerId), { totalReferrals: increment(1) });
        await loadReferredUsers(referrerId);
    }
}

// Award Referral Earnings
async function awardReferrerOnPayment(userId) {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { paymentStatus: true });

    const userDoc = await getDoc(userRef);
    const referrerId = userDoc.data().referralCode;
    if (!referrerId) {
        console.log(`User ${userId} has no referrer.`);
        return;
    }

    const referrerRef = doc(db, "users", referrerId);
    await updateDoc(referrerRef, { totalEarnings: increment(2.5) });
    console.log(`Referrer ${referrerId} earned +2.5.`);

    const referrerDoc = await getDoc(referrerRef);
    const grandReferrerId = referrerDoc.data().referralCode;
    if (grandReferrerId) {
        const grandReferrerRef = doc(db, "users", grandReferrerId);
        await updateDoc(grandReferrerRef, { totalEarnings: increment(0.5) });
        console.log(`Grand referrer ${grandReferrerId} earned +0.5.`);
    }

}

export { awardReferrerOnPayment, saveUserWithReferral };
