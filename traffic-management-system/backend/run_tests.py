import unittest
import sys
from test_helmet_logic import TestHelmetDetector

# Create a suite
suite = unittest.TestLoader().loadTestsFromTestCase(TestHelmetDetector)

# Run
result = unittest.TextTestRunner(verbosity=2).run(suite)

if result.wasSuccessful():
    print("ALL TESTS PASSED")
    sys.exit(0)
else:
    print("TESTS FAILED")
    for failure in result.failures:
        print(failure[0])
        print(failure[1])
    for error in result.errors:
        print(error[0])
        print(error[1])
    sys.exit(1)
