Directory structure:
└── dylanb101-eth-oxford-26/
    ├── FDC_ADDRESS_GUIDE.md
    ├── SETUP.md
    ├── backend/
    │   ├── README.md
    │   ├── ai_agent.py
    │   ├── app.py
    │   ├── aviation_api.py
    │   ├── main.py
    │   ├── requirements.txt
    │   ├── schemas.py
    │   └── signing_utils.py
    ├── flare-hardhat/
    │   ├── README.md
    │   ├── hardhat.config.js
    │   ├── package.json
    │   ├── abi/
    │   │   ├── FDCVerifier.json
    │   │   ├── FlightInsurance.json
    │   │   └── PayoutEngine.json
    │   ├── contracts/
    │   │   ├── FlightInsurance.sol
    │   │   ├── PayoutEngine.sol
    │   │   ├── SimpleStorage.sol
    │   │   └── interfaces/
    │   │       ├── IFlareDataConnector.sol
    │   │       └── ISecureRandom.sol
    │   ├── scripts/
    │   │   ├── deploy-flight-insurance.js
    │   │   ├── deploy.js
    │   │   └── listenFDC.js
    │   └── test/
    │       ├── FlightInsurance.test.js
    │       └── SimpleStorage.test.js
    └── frontend/
        ├── README.md
        ├── package.json
        ├── .env.example
        ├── public/
        │   └── index.html
        └── src/
            ├── App.css
            ├── App.js
            ├── index.css
            ├── index.js
            └── services/
                └── aviationStackService.js
