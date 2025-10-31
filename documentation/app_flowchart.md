flowchart TD
    A[Start] --> B{Authenticated?}
    B -- No --> C[Show Sign In]
    B -- Yes --> E[Show Dashboard]
    C --> D[Authenticate]
    D -- Success --> B
    E --> F[Manage Ingredients]
    E --> G[Setup Animal Profile]
    E --> H[Run Formulation]
    H --> I[Show Results]
    I --> E