"""
Creates a .csv file from a csTimer .txt file.

Usage:
    python csTimer2excel.py <input_file> <output_file>

Arguments:
    input_file: The .txt file to be converted.
    output_file: The .csv file to be created.

Example:
    python csTimer2excel.py input.txt output.csv

Dependencies:
    pandas
    openpyxl

Author:
    David Alvarezs

    GitHub: @Davidam2
    
    Date start: March 14th, 2025

    Last update: March 15th, 2025
"""

import numpy as np
import argparse
import json
import pandas as pd
from datetime import datetime

class csTimer2excel:
    def __init__(self, input_file, output_file = None):
        self.input_file = open(input_file, 'r')
        self.output_file = output_file

        self.data = json.load(self.input_file)
        self.properties = self.data['properties']
        self.sessionData = json.loads(self.properties['sessionData'])

        self.sessions_df = pd.DataFrame(columns = ['Name', 'Num solves',
                                                   'Date start', 'Date end',
                                                   'Average', 'Best time',
                                                   'Best avg5', 'Best avg12',
                                                   'Best avg100', 'Best avg1000',
                                                   'Best avg5000', 'Best avg10000'])
        self.sessions_df = self.sessions_df.astype({'Name': 'object',
                                                   'Num solves': 'int',
                                                   'Date start': 'object',
                                                   'Date end': 'object',
                                                   'Average': 'float',
                                                   'Best time': 'float',
                                                   'Best avg5': 'float',
                                                   'Best avg12': 'float',
                                                   'Best avg100': 'float',
                                                   'Best avg1000': 'float',
                                                   'Best avg5000': 'float',
                                                   'Best avg10000': 'float'})
        

    def get_dates(self, sessionIndex):
        """
        Gets the start and end dates of the session.
        """
        session_start = self.sessionData[str(sessionIndex)]['date'][0]
        session_end = self.sessionData[str(sessionIndex)]['date'][1]
        date_start = datetime.fromtimestamp(session_start, tz=None).strftime(
            '%Y-%m-%d %H:%M:%S')
        date_end = datetime.fromtimestamp(session_end, tz=None).strftime(
            '%Y-%m-%d %H:%M:%S')
        return date_start, date_end


    def analyze_time(self, scramble):
        """
        Analyzes the time of the scramble.
        """
        penalty = scramble[0][0]
        time = scramble[0][1]/1000
        date = datetime.fromtimestamp(scramble[-1], tz=None).strftime(
            '%Y-%m-%d %H:%M:%S')
        mix = scramble[1]

        return penalty, time, date, mix


    def get_stat(self, sessionIdx):
        """
        Analyzes the session.
        """
        session_stat = self.properties['sessionData'][str(sessionIdx)]['stat']
        num_soves = session_stat[0]
        session_avg = session_stat[2]


    def calculate_avg(self, times):
        """
        Calculates the average from a list of solves.
        
        Removes the 5% best and worst solves and calculates the average.
        """
        sorted_times = sorted(times)
        remove = int(np.ceil(len(sorted_times) * 0.05))
        sorted_times = sorted_times[remove:-remove]
        avg = np.round(sum(sorted_times) / len(sorted_times), 3)
        return avg


    def save_session(self, sessionIdx):
        """
        Saves the session data.
        """
        start, end = self.get_dates(sessionIdx)
        session_name = self.sessionData[str(sessionIdx)]['name']
        num_solves = self.sessionData[str(sessionIdx)]['stat'][0]
        avg = np.round(self.sessionData[str(sessionIdx)]['stat'][2]/1000, 3)

        self.sessions_df = pd.concat([self.sessions_df, pd.DataFrame(
            {'Name': [session_name], 'Num solves': [num_solves],
             'Date start': [start], 'Date end': [end], 'Average': [avg],
             'Best time': '', 'Best avg5': '', 'Best avg12': '',
             'Best avg100': '', 'Best avg1000': '', 'Best avg5000': '',
             'Best avg10000': ''})], ignore_index=True)


    def convert(self):
        """
        Converts the .txt file to a .csv file.
        """
        # Create a DataFrame
        df = pd.DataFrame(columns = ['Session', 'Num', 'Date', 'Time', 'Penalty',
                                     'Mix', 'avg5', 'avg12', 'avg100', 'avg1000',
                                     'avg5000', 'avg10000'])
        df = df.astype({'Session': 'object', 'Num': 'int', 'Date': 'object',
                        'Time': 'float', 'Penalty': 'object', 'Mix': 'object',
                        'avg5': 'float', 'avg12': 'float', 'avg100': 'float',
                        'avg1000': 'float', 'avg5000': 'float', 'avg10000': 'float'
        })
        
        num_sessions = self.properties['sessionN'] # Number of sessions

        for i in range (1, num_sessions + 1):
            self.save_session(i)
            date_start, date_end = self.get_dates(i)
            session = self.data['session' + str(i)]
            name_session = self.sessionData[str(i)]['name']

            # Dictionary with averages and best averages
            dict_avgs = {'avg5': [], 'avg12': [], 'avg100': [], 'avg1000': [],
                         'avg5000': [], 'avg10000': []}
            current_avgs = {'avg5': '', 'avg12': '', 'avg100': '', 'avg1000': '',
                           'avg5000': '', 'avg10000': ''}
            best_avg = {'avg1': 100, 'avg5': '', 'avg12': '', 'avg100': '',
                        'avg1000': '', 'avg5000': '', 'avg10000': ''}

            for j, scramble in enumerate(session):
                penalty, time, date, mix = self.analyze_time(scramble)

                # Calculate the best averages
                if time < best_avg['avg1']:
                    best_avg['avg1'] = time
                for avg in ['avg5', 'avg12', 'avg100', 'avg1000', 'avg5000',
                            'avg10000']:
                    if len (dict_avgs[avg]) >= int(avg[3:]):
                        dict_avgs[avg].pop(0)
                    dict_avgs[avg].append(time)
                    if len(dict_avgs[avg]) == int(avg[3:]):
                        avg_time = self.calculate_avg(dict_avgs[avg])
                        current_avgs[avg] = avg_time
                        if best_avg[avg] == '':
                            best_avg[avg] = avg_time
                        elif avg_time < best_avg[avg]:
                            best_avg[avg] = avg_time

                df = pd.concat([df, pd.DataFrame(
                    {'Session': [name_session], 'Num':j+1, 'Date': [date], 
                     'Time': [time], 'Penalty': [penalty], 'Mix': [mix],
                     'avg5': [current_avgs['avg5']],
                     'avg12': [current_avgs['avg12']],
                     'avg100': [current_avgs['avg100']],
                     'avg1000': [current_avgs['avg1000']],
                     'avg5000': [current_avgs['avg5000']],
                     'avg10000': [current_avgs['avg10000']]} )],
                     ignore_index=True)

            # Save the best averages
            self.sessions_df.at[i-1, 'Best time'] = best_avg['avg1']
            self.sessions_df.at[i-1, 'Best avg5'] = best_avg['avg5']
            self.sessions_df.at[i-1, 'Best avg12'] = best_avg['avg12']
            self.sessions_df.at[i-1, 'Best avg100'] = best_avg['avg100']
            self.sessions_df.at[i-1, 'Best avg1000'] = best_avg['avg1000']
            self.sessions_df.at[i-1, 'Best avg5000'] = best_avg['avg5000']
            self.sessions_df.at[i-1, 'Best avg10000'] = best_avg['avg10000']
       
        # Save the DataFrames to .csv files
        df.to_csv(self.output_file, index = False)
        self.sessions_df.to_csv('sessions.csv', index = False)

        self.input_file.close()


    def save(self):
        pass
    

if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Converts a csTimer .txt file to a .xlsx file.')
    parser.add_argument('--input_file', '-i', type=str,
                        help='The .txt file to be converted.')
    parser.add_argument('--output_file', '-o', type=str,
                        help='The .xlsx file to be created.')
    args = parser.parse_args()

    input_file = args.input_file
    output_file = args.output_file

    converter = csTimer2excel(input_file, output_file)
    converter.convert()
    converter.save()

    print('Conversion complete.')