# Setup and run complete integration tests
python run_tests.py --type workflow --setup-django --verbose

# Run Django-specific tests
python run_tests.py --type django --setup-django

# Run FastAPI-only tests  
python run_tests.py --type fastapi --verbose

# Run everything with coverage
python run_tests.py --type all --setup-django --coverage --html
