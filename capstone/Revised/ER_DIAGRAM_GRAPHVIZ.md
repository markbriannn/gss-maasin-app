# ER Diagram - Graphviz DOT Format

Copy the code below and paste it into https://dreampuf.github.io/GraphvizOnline/ to generate the image.

```dot
digraph ER_Diagram {
  rankdir=TB;
  node [shape=record, fontname="Arial"];
  edge [fontname="Arial", fontsize=10];

  // Entities
  USERS [label="{USERS|uid (PK)\lemail (UK)\lpassword\lfirstName\lmiddleName\llastName\lsuffix\lphoneNumber (UK)\ldateOfBirth\lprofilePhoto\lrole\lstreetAddress\lbarangay\lcity\lprovince\llatitude\llongitude\lcreatedAt\lupdatedAt\l}"];
  
  CLIENTS [label="{CLIENTS|uid (PK, FK)\lfavorites\l}"];
  
  PROVIDERS [label="{PROVIDERS|uid (PK, FK)\lserviceCategory\laboutService\lyearsExperience\lpriceType\lfixedPrice\lproviderStatus\lrating\laverageRating\lreviewCount\lcompletedJobs\lisOnline\ldocuments\l}"];
  
  ADMINS [label="{ADMINS|uid (PK, FK)\lpermissions\l}"];
  
  BOOKINGS [label="{BOOKINGS|bookingId (PK)\lclientId (FK)\lproviderId (FK)\lserviceCategory\lserviceDescription\lscheduledDate\lscheduledTime\lstatus\ladminApproved\ladminApprovedBy (FK)\lamount\lpaymentStatus\lpaymentIntentId\lclientLocation\lproviderLocation\lcreatedAt\lupdatedAt\l}"];
  
  REVIEWS [label="{REVIEWS|reviewId (PK)\lbookingId (FK)\lclientId (FK)\lproviderId (FK)\lrating\lcomment\lcreatedAt\l}"];
  
  TRANSACTIONS [label="{TRANSACTIONS|transactionId (PK)\lbookingId (FK)\lclientId (FK)\lproviderId (FK)\lamount\ltype\lstatus\lpaymentMethod\lpaymentIntentId\lcreatedAt\l}"];
  
  CONVERSATIONS [label="{CONVERSATIONS|conversationId (PK)\lparticipants\lparticipantDetails\llastMessage\llastMessageTime\lunreadCount\ltyping\ldeletedBy\lcreatedAt\lupdatedAt\l}"];
  
  MESSAGES [label="{MESSAGES|messageId (PK)\lconversationId (FK)\lsenderId (FK)\ltext\lread\lreadAt\ltype\limageUrl\lcreatedAt\l}"];
  
  NOTIFICATIONS [label="{NOTIFICATIONS|notificationId (PK)\luserId (FK)\ltitle\lbody\ltype\ldata\lread\lreadAt\lcreatedAt\l}"];
  
  DEVICE_TOKENS [label="{DEVICE_TOKENS|tokenId (PK)\luserId (FK)\ltoken\lplatform\lcreatedAt\lupdatedAt\l}"];
  
  PAYOUT_ACCOUNTS [label="{PAYOUT_ACCOUNTS|accountId (PK)\lproviderId (FK)\laccountType\laccountName\laccountNumber\lbankName\lisDefault\lcreatedAt\l}"];
  
  PAYOUT_REQUESTS [label="{PAYOUT_REQUESTS|payoutId (PK)\lproviderId (FK)\laccountId (FK)\lamount\lstatus\lrequestedAt\lprocessedAt\lprocessedBy (FK)\lrejectionReason\lcompletedAt\lreferenceNumber\l}"];
  
  PAYMENT_METHODS [label="{PAYMENT_METHODS|methodId (PK)\luserId (FK)\ltype\lname\laccountNumber\laccountName\lisDefault\lcreatedAt\l}"];
  
  GAMIFICATION [label="{GAMIFICATION|gamificationId (PK)\luserId (FK)\lpoints\llevel\ltier\lbadges\lachievements\lstreak\llastActivityDate\ltotalBookings\ltotalSpent\lcreatedAt\lupdatedAt\l}"];

  // Relationships
  USERS -> CLIENTS [label="is a", dir=both, arrowhead=none, arrowtail=none];
  USERS -> PROVIDERS [label="is a", dir=both, arrowhead=none, arrowtail=none];
  USERS -> ADMINS [label="is a", dir=both, arrowhead=none, arrowtail=none];
  CLIENTS -> BOOKINGS [label="creates", arrowhead=crow];
  PROVIDERS -> BOOKINGS [label="accepts", arrowhead=crow];
  ADMINS -> BOOKINGS [label="approves", arrowhead=crow];
  BOOKINGS -> REVIEWS [label="has", arrowhead=tee];
  BOOKINGS -> TRANSACTIONS [label="generates", dir=both, arrowhead=none, arrowtail=none];
  USERS -> CONVERSATIONS [label="participates in", dir=both, arrowhead=crow, arrowtail=crow];
  CONVERSATIONS -> MESSAGES [label="contains", arrowhead=crow];
  USERS -> MESSAGES [label="sends", arrowhead=crow];
  USERS -> NOTIFICATIONS [label="receives", arrowhead=crow];
  USERS -> DEVICE_TOKENS [label="has token", arrowhead=crow];
  PROVIDERS -> PAYOUT_ACCOUNTS [label="has account", arrowhead=crow];
  PROVIDERS -> PAYOUT_REQUESTS [label="requests payout", arrowhead=crow];
  PAYOUT_REQUESTS -> PAYOUT_ACCOUNTS [label="uses", dir=both, arrowhead=none, arrowtail=crow];
  ADMINS -> PAYOUT_REQUESTS [label="processes", arrowhead=crow];
  USERS -> PAYMENT_METHODS [label="has method", arrowhead=crow];
  USERS -> GAMIFICATION [label="has points", dir=both, arrowhead=none, arrowtail=none];
}
```

## Instructions:

1. Go to https://dreampuf.github.io/GraphvizOnline/
2. Copy the entire code block above (from digraph to the closing })
3. Paste it into the editor
4. The diagram will automatically render
5. Right-click on the diagram to save as PNG or SVG

## Alternative Online Tools:

- https://edotor.net/ (Graphviz editor)
- https://viz-js.com/ (Graphviz in browser)

## Alternative: Use Graphviz locally

If you have Graphviz installed:

```bash
# Install Graphviz (Windows with Chocolatey)
choco install graphviz

# Generate diagram
dot -Tpng ER_DIAGRAM_GRAPHVIZ.md -o er_diagram.png
```
