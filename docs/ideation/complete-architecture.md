graph TD
    %% Data Sources and Integration
    DS[External Data Sources] -->|APIs| DI[Data Integration Layer]
    DI --> DP{Data Processor}
    
    %% Data Processing Pipeline
    DP -->|Validation| DV[Data Validation]
    DP -->|Standardization| DS1[Data Standardization]
    DP -->|Aggregation| DA[Data Aggregation]
    DV & DS1 & DA --> DB[(Data Storage)]
    
    %% Core Calculation Engine
    DB --> CE[Core Engine]
    subgraph "FSFVI Calculator"
        CE --> EQ1["Eq(1): δᵢ = |xᵢ-x̄ᵢ|/xᵢ"]
        CE --> EQ2["Eq(2): νᵢ(fᵢ) = δᵢ·1/(1+αᵢfᵢ)"]
        CE --> EQ3["Eq(3): FSFVI = Σωᵢ·νᵢ(fᵢ)"]
    end
    
    %% Optimization Engine
    EQ1 & EQ2 & EQ3 --> OE[Optimization Engine]
    subgraph "Resource Optimizer"
        OE --> CON1["Eq(4): Σfᵢ ≤ F"]
        OE --> CON2["Eq(5): fᵢ ≥ 0"]
        OE --> CON3["Eq(6): fᵢ ≥ fⱼ if δᵢ ≥ δⱼ"]
        OE --> OBJ["Eq(7): Min Σωᵢ·νᵢ(fᵢ)"]
    end
    
    %% Analysis & Comparison
    CON1 & CON2 & CON3 & OBJ --> AE[Analytics Engine]
    subgraph "Gap Analysis"
        AE --> GAP1["Eq(8): GapFSFVI"]
        AE --> GAP2["Eq(9): Gap Ratio"]
        AE --> GAP3["Eq(10): Efficiency Index"]
    end
    
    %% Stakeholder Interfaces
    GAP1 & GAP2 & GAP3 --> UI[User Interface Layer]
    
    subgraph "Stakeholder Interfaces"
        UI --> GOV["Government Dashboard
        - System Vulnerability
        - Resource Optimization
        - Policy Simulation"]
        
        UI --> INV["Investor Interface
        - ROI Analysis
        - Risk Assessment
        - Impact Tracking"]
        
        UI --> VAL["Value Chain Dashboard
        - Performance Metrics
        - Resource Tracking
        - Benchmarking"]
    end
    
    %% Monitoring System
    DB --> MON[Monitoring System]
    subgraph "Real-time Monitoring"
        MON --> PM[Performance Monitor]
        MON --> AS[Alert System]
        MON --> TM[Threshold Manager]
    end
    
    PM & AS & TM --> UI

    %% Equation Legend
    subgraph "Equation Legend"
        L1["Eq(1): Performance Gap
        δᵢ = gap between actual and benchmark
        xᵢ = observed performance
        x̄ᵢ = benchmark performance"]
        
        L2["Eq(2): Component Vulnerability
        νᵢ = vulnerability score
        fᵢ = financial allocation
        αᵢ = sensitivity parameter"]
        
        L3["Eq(3): System Vulnerability
        FSFVI = overall system score
        ωᵢ = component weight"]
        
        L4["Eq(4-7): Optimization Constraints
        F = total budget
        fᵢ ≥ 0 = non-negative allocation
        Priority based on gap size"]
        
        L5["Eq(8-10): Performance Metrics
        GapFSFVI = absolute difference
        Gap Ratio = normalized gap
        Efficiency Index = optimization measure"]
    end

    style GOV fill:#e6ffe6
    style INV fill:#e6f3ff
    style VAL fill:#fff0e6
    style FSFVI Calculator fill:#f0f0f0
    style Resource Optimizer fill:#f0f0f0
    style Gap Analysis fill:#f0f0f0
    style Real-time Monitoring fill:#ffe6e6
    style L1 fill:#f5f5f5
    style L2 fill:#f5f5f5
    style L3 fill:#f5f5f5
    style L4 fill:#f5f5f5
    style L5 fill:#f5f5f5