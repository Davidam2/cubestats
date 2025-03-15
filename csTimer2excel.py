"""
Creates a .xlsx file from a csTimer .txt file.

Usage:
    python csTimer2excel.py <input_file> <output_file>

Arguments:
    input_file: The .txt file to be converted.
    output_file: The .xlsx file to be created.

Example:
    python csTimer2excel.py input.txt output.xlsx

Dependencies:
    pandas
    openpyxl

Author:
    David Alvarezs

    GitHub: @Davidam2
    
    Date: March 14th, 2025
"""

import argparse
import json
import pandas as pd
from datetime import datetime


class csTimer2excel:
    def __init__(self, input_file, output_file = None):
        self.input_file = input_file
        self.output_file = output_file

    def read(self):
        """
        Reads the .txt file.
        """
        self.file = open(self.input_file, 'r')
        self.data = json.load(self.file)
        self.data_keys = self.data.keys()
        self.properties = self.data['properties']
        self.prop_keys = self.properties.keys()

    def get_dates(self, sessionIndex):
        """
        Gets the start and end dates of the session.
        """
        sessionData = self.properties['sessionData']
        sessionData = json.loads(sessionData)
        session_keys = sessionData.keys()
        for session in session_keys:
            print('Session:', session)
            session_start = sessionData[session]['date'][0]
            session_end = sessionData[session]['date'][1]
            date_start = datetime.fromtimestamp(session_start, tz=None).strftime('%Y-%m-%d %H:%M:%S')
            date_end = datetime.fromtimestamp(session_end, tz=None).strftime('%Y-%m-%d %H:%M:%S')
        return date_start, date_end

    def convert(self):
        """
        Converts the .txt file to a .xlsx file.
        """
        self.read()
        print('Converting', self.input_file)
        print('Data keys:', self.data_keys)
        print('Properties:', self.prop_keys)
        num_sessions = self.properties['sessionN'] # Number of sessions

        for i in range (1, num_sessions + 1):
            print('Session:', i)
            date_start, date_end = self.get_dates(i)
            print('Session:', i)
            print('Start date:', date_start)
            print('End date:', date_end)
            
        self.file.close()

    def save(self):
        pass

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Converts a csTimer .txt file to a .xlsx file.')
    parser.add_argument('--input_file', '-i', type=str, help='The .txt file to be converted.')
    # parser.add_argument('--output_file', '-o', type=str, help='The .xlsx file to be created.')
    args = parser.parse_args()

    input_file = args.input_file
    # output_file = args.output_file

    # converter = csTimer2excel(input_file, output_file)
    converter = csTimer2excel(input_file)
    converter.convert()
    converter.save()

    print('Conversion complete.')