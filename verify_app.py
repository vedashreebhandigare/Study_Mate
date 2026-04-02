import sys
import os

# Set working directory to a different folder to test path robustness
os.chdir(os.environ['USERPROFILE'])
print(f"Current Working Directory: {os.getcwd()}")

# Path to the script's directory
script_dir = r"C:\Users\PRANAY\Downloads\Cap\Enhaced_Study_Attention_Monitoring--main\Enhaced_Study_Attention_Monitoring--main\Attention_monitoring-main"
sys.path.append(script_dir)

print(f"Importing app from {script_dir}...")
try:
    # Importing app will trigger the startup logic in app.py
    import app
    print("\n✅ SUCCESS: Module imported and paths resolved correctly.")
except Exception as e:
    print(f"\n❌ FAILED: {e}")
    sys.exit(1)
