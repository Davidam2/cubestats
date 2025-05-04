import random
import numpy as np
import sys

from PyQt6.QtCore import Qt, QTime, QTimer, pyqtSignal, QDateTime
from PyQt6.QtWidgets import (QApplication, QMainWindow, QColorDialog, QDialog,
                             QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
                             QPushButton, QComboBox, QTableWidget,
                             QTableWidgetItem, QHeaderView)

import sqlite3

from interfaces.timer_view import Ui_MainWindow
from interfaces.modify_dialog import ModifyDialog
from interfaces.options_dialog import OptionsDialog


class Options(object):
    'Class to hold the options for the timer'
    
    def __init__(self):
        self.cube_type = '3x3'
        self.scramble_length = 20
        self.show_scramble = True
        self.show_time = True
        self.show_cube = False
        self.show_moves = False
        self.show_stats = False


class MainWindow(QMainWindow, Ui_MainWindow):
    """
    Runtime logic for the timer window
    """

    def __init__(self):
        super().__init__()
        self.setupUi(self)
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)
        self.setFocus()

        # Set up options
        self.options = Options()

        # Timer setup
        self.timer = QTimer(self, interval=10)
        self.timer.timeout.connect(self.update_timer)
        self.start_time = None
        self.elapsed_time = 0.0
        self.running = False
        self.statusBar().showMessage('Do your first solve')
        self.space_press_time = None
        self.hold_threshold = 300
        self.color_timer = QTimer(self)
        self.color_timer.setSingleShot(True)
        self.session = self.comboBox_session.currentText()
        
        # Set up time variables
        self.all_solves = []
        self.fastest_time = float('inf')
        self.solves_count = 0
        self.last5_times = []
        self.last12_times = []
        self.best_ao5 = float('inf')
        self.best_ao12 = float('inf')

        # Setup database connection
        self.db_connection = sqlite3.connect('database/cubestats.db')
        self.cursor = self.db_connection.cursor()
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS solves (
                Session TEXT,
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                Date TEXT,
                Time REAL,
                Penalty TEXT,
                Mix TEXT,
                avg5 REAL,
                avg12 REAL,
                avg100 REAL,
                avg1000 REAL,
                avg5000 REAL,
                avg10000 REAL
            )
        ''')
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                name TEXT PRIMARY KEY
            )
        ''')

        self.db_connection.commit()
        self.setup_table()
        self.load_saved_solves()
        self.load_sessions()

        # Set up options
        self.is_focus_active = False

        # Scramble setup
        self.label_scramble.setText(self.generate_scramble())

        # Connect signals
        self.comboBox_cube_type.currentTextChanged.connect(self.update_scramble)
        self.actionChange_Background.triggered.connect(self.change_background)
        self.actionFocus_Mode.triggered.connect(self.trigger_focus_mode)
        self.button_modify_time.clicked.connect(self.modify_dialog)
        self.button_plus2.clicked.connect(self.modify_time)
        self.button_DNF.clicked.connect(self.modify_time)
        self.button_remove.clicked.connect(self.modify_time)
        self.actionOptions.triggered.connect(self.options_dialog)
        self.color_timer.timeout.connect(self._turn_label_green)
        self.comboBox_session.currentTextChanged.connect(self.load_saved_solves)
        self.button_new_session.clicked.connect(self.new_session)
        self.button_remove_session.clicked.connect(self.delete_session)

    
    def _turn_label_green(self):
        'Turns the label color to green if space is still pressed'
        if not self.running:
            self.label_time.setStyleSheet("color: green;")


    def keyPressEvent(self, event):
        'Handles key press events'
        if event.key() == Qt.Key.Key_Space and not event.isAutoRepeat():
            if self.running:
                self.stop_timer()
            else:
                self.space_press_time = QTime.currentTime()
                self.label_time.setStyleSheet("color: red;")
                self.color_timer.start(self.hold_threshold)
        else:
            super().keyPressEvent(event)


    def keyReleaseEvent(self, event):
        'Handles key release events'
        if event.key() == Qt.Key.Key_Space:
            self.color_timer.stop()
            self.label_time.setStyleSheet('')

            if self.space_press_time is not None and not self.running:
                hold_duration = self.space_press_time.msecsTo(QTime.currentTime())
                if hold_duration > self.hold_threshold:
                    self.start_timer()
                
                self.space_press_time = None
        else:
            super().keyReleaseEvent(event)


    def setup_table(self):
        'Sets up the table for the previous times'
        self.table_previous_times.setColumnCount(3)
        self.table_previous_times.setHorizontalHeaderLabels(['id', 'Time (s)',
                                                             'Date'])
        self.table_previous_times.hideColumn(0)
        header = self.table_previous_times.horizontalHeader()
        header.setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        header.setSectionResizeMode(1, QHeaderView.ResizeMode.ResizeToContents)

    
    def load_sessions(self):
        """Populate comboBox_session, creating a default if needed."""
        rows = self.cursor.execute('SELECT name FROM sessions').fetchall()
        if not rows:
            # first launch: create 5 default sessions
            for i in range(1, 6):
                self.cursor.execute(
                    'INSERT INTO sessions(name) VALUES (?)', (str(i),))
            self.db_connection.commit()
            rows = [(str(i),) for i in range(1, 6)]

        self.comboBox_session.clear()
        for (name,) in rows:
            self.comboBox_session.addItem(name)
        self.comboBox_session.setCurrentIndex(0)


    def load_saved_solves(self):
        'Loads the saved solves from the database'
        self.session = self.comboBox_session.currentText()

        # Reset in-memory stats
        self.all_solves = []
        self.solves_count = 0
        self.fastest_time = float('inf')
        self.best_ao5 = float('inf')
        self.best_ao12 = float('inf')
        self.last5_times = []
        self.last12_times = []
        self.table_previous_times.setRowCount(0)

        self.cursor.execute(
            'SELECT id, Time, Date FROM solves WHERE Session = ? ORDER BY id',
            (self.session,)
        )
        rows = self.cursor.fetchall()

        self.solves_count = len(rows)
        self.all_solves = [row[1] if isinstance(row[1], (int, float)) else float('inf') for row in rows]

        if self.all_solves:
            self.fastest_time = min(self.all_solves)
            
        for solve_id, time, date in rows:
            row = self.table_previous_times.rowCount()
            self.table_previous_times.insertRow(row)
            self.table_previous_times.setItem(row, 0, QTableWidgetItem(str(solve_id)))
            self.table_previous_times.setItem(row, 1, QTableWidgetItem(str(time)))
            self.table_previous_times.setItem(row, 2, QTableWidgetItem(str(date)))

        # Refresh status bar
        fastest_str = (f'{self.fastest_time:.3f}'
                        if self.fastest_time != float('inf') else 'N/A')
        self.statusBar().showMessage(
            f'Session "{self.session}": {self.solves_count} solves, '
            f'Fastest: {fastest_str} s'
        )


    def update_scramble(self):
        'Updates the scramble label with a new scramble'
        self.options.cube_type = self.comboBox_cube_type.currentText()
        # self.label_scramble.setText(self.generate_scramble())
        self.label_scramble.setText(self.generate_scramble())


    def generate_scramble(self):
        'Generates a ramdom scramble for the selected cube type'
        if self.options.cube_type == '3x3':
            faces = ['R', 'L', 'U', 'D', 'F', 'B']
            modifiers = ['', "'", '2']
            scramble = []
            prev_face = ''
            for _ in range(self.options.scramble_length):
                face = random.choice(faces)
                while face == prev_face:
                    face = random.choice(faces)
                prev_face = face
                move = face + random.choice(modifiers)
                scramble.append(move)
            return ' '.join(scramble)
        
        elif self.options.cube_type == '2x2':
            faces = ['R', 'U', 'F']
            modifiers = ['', "'", '2']
            scramble = []
            prev_face = ''
            for _ in range(self.options.scramble_length):
                face = random.choice(faces)
                while face == prev_face:
                    face = random.choice(faces)
                prev_face = face
                move = face + random.choice(modifiers)
                scramble.append(move)
            return ' '.join(scramble)


    def update_timer(self):
        'Updates the timer display'
        if self.is_focus_active:
            self.label_time.setText('')
            return
        current_time = QTime.currentTime()
        elapsed = current_time.msecsSinceStartOfDay() - self.start_time
        self.label_time.setText(f"{elapsed / 1000:.3f}")

    
    def start_timer(self):
        'Starts the timer'
        if not self.running:
            if self.is_focus_active:
                self.label_time.setText('')
            else:
                self.label_time.setText('0.000')
            
            self.start_time = QTime.currentTime().msecsSinceStartOfDay()
            self.running = True
            self.elapsed_time = 0
            self.timer.start()

            if  self.solves_count > 0:
                ao5_str = f'{self.best_ao5:.3f}' if self.best_ao5 != float('inf') else 'N/A'
                ao12_str = f'{self.best_ao12:.3f}' if self.best_ao12 != float('inf') else 'N/A'
                fastest_str = f'{self.fastest_time:.3f}' if self.fastest_time != float('inf') else 'N/A'
                self.statusBar().showMessage(f'Fastest: {fastest_str} s - Best ao5: {ao5_str} s - Best ao12: {ao12_str} s')
            else:
                self.statusBar().showMessage('Do your first solve')


    def stop_timer(self):
        'Stops the timer'
        if self.running:
            self.timer.stop()
            self.running = False
            current_msec = QTime.currentTime().msecsSinceStartOfDay()

            self.elapsed_time = current_msec - self.start_time
            self.label_time.setText(f"{self.elapsed_time / 1000:.3f}")

            self.update_scramble()
            self.save_time()

    
    def new_session(self):
        from PyQt6.QtWidgets import QInputDialog, QMessageBox
        name, ok = QInputDialog.getText(self, "New Session", "Session name:")
        if ok and name:
            try:
                self.cursor.execute(
                    'INSERT INTO sessions(name) VALUES (?)', (name,)
                )
                self.db_connection.commit()
            except sqlite3.IntegrityError:
                QMessageBox.warning(
                    self, "Duplicate",
                    f"Session “{name}” already exists."
                )
                return
            self.comboBox_session.addItem(name)
            self.comboBox_session.setCurrentText(name)

    def delete_session(self):
        from PyQt6.QtWidgets import QMessageBox
        session = self.comboBox_session.currentText()
        answer = QMessageBox.question(
            self, "Delete Session",
            f"Delete session “{session}” and all its solves?",
            QMessageBox.StandardButton.Yes |
            QMessageBox.StandardButton.No
        )
        if answer != QMessageBox.StandardButton.Yes:
            return

        # remove from DB
        self.cursor.execute(
            'DELETE FROM solves WHERE Session = ?', (session,)
        )
        self.cursor.execute(
            'DELETE FROM sessions WHERE name = ?', (session,)
        )
        self.db_connection.commit()

        # remove from combo and pick fallback
        idx = self.comboBox_session.currentIndex()
        self.comboBox_session.removeItem(idx)
        if self.comboBox_session.count() == 0:
            # recreate a default
            self.cursor.execute(
                'INSERT INTO sessions(name) VALUES (?)', ('Default',)
            )
            self.db_connection.commit()
            self.comboBox_session.addItem('Default')
        self.comboBox_session.setCurrentIndex(0)
        self.load_saved_solves()


    def save_time(self):
        'Add solve to the label_past_times'
        time = float(self.label_time.text())
        date = QDateTime.currentDateTime().toString('yyyy-MM-dd HH:mm:ss')
        # Insert the time into the database
        self.session = self.comboBox_session.currentText()
        self.cursor.execute('INSERT INTO solves (Session, Time, Date) VALUES \
                            (?, ?, ?)', (self.session, time, str(date)))
        self.db_connection.commit()
        solve_id = self.cursor.lastrowid

        self.all_solves.append(time)
        # Check if the time is a new best time
        self.solves_count += 1
        if time < self.fastest_time:
            self.fastest_time = time
            self.statusBar().showMessage(f'New fastest time: {self.fastest_time} seconds')

        # Update the table with the new time
        row = self.table_previous_times.rowCount()
        self.table_previous_times.insertRow(row)
        self.table_previous_times.setItem(row, 0, QTableWidgetItem(str(solve_id)))
        self.table_previous_times.setItem(row, 1, QTableWidgetItem(str(time)))
        self.table_previous_times.setItem(row, 2, QTableWidgetItem(str(date)))

        averages = self.calculate_averages(5, 12)
        ao5 = averages[5]
        ao12 = averages[12]
        self.last5_times.append(time)
        self.last12_times.append(time)

        if self.solves_count > 5:
            self.last5_times.pop(0)
            if ao5 < self.best_ao5:
                self.best_ao5 = ao5
                self.statusBar().showMessage(f'New best AO5: {self.best_ao5:.3f} seconds')
        if self.solves_count > 12:
            self.last12_times.pop(0)
            if ao12 < self.best_ao12:
                self.best_ao12 = ao12
                self.statusBar().showMessage(f'New best AO12: {self.best_ao12:.3f} seconds')


    def change_background(self):
        'Changes the background of the window'
        dialog = QDialog(self)
        dialog.setWindowTitle("Change Background")
        layout = QVBoxLayout(dialog)

        label = QLabel("Select a background color:")
        layout.addWidget(label)

        combo_box = QComboBox()
        combo_box.addItems(['dark_flat', 'fusion_rounded', 'glass_efect', 
                            'light_minimal', 'material_blue'])
        layout.addWidget(combo_box)
        button_box = QHBoxLayout()
        ok_button = QPushButton("OK")
        cancel_button = QPushButton("Cancel")
        button_box.addWidget(ok_button)
        button_box.addWidget(cancel_button)
        layout.addLayout(button_box)
        ok_button.clicked.connect(lambda: self.apply_style(combo_box.currentText()))
        cancel_button.clicked.connect(dialog.close)
        dialog.setLayout(layout)
        dialog.exec()
        

    def apply_style(self, style_name):
        'Applies the selected style to the window'
        with open(f"styles/{style_name}.qss", "r") as style_file:
            self.setStyleSheet(style_file.read())
        self.statusBar().showMessage(f'Style changed to {style_name}')
        self.update()

    
    def trigger_focus_mode(self):
        'Triggers focus mode'
        self.is_focus_active = not self.is_focus_active
        if self.is_focus_active:
            self.statusBar().showMessage('Focus mode activated')
        else:
            self.statusBar().showMessage('Focus mode deactivated')


    def calculate_averages(self, *kwargs):
        'Calculates the averages for the last kwargs solves'
        averages = {}
        for num in kwargs:
            times = getattr(self, f'last{num}_times', [])
            averages[num] = np.sum(times) / len(times)
        return averages
    
    
    def modify_dialog(self):
        'Opens a dialog to modify the last recorded time'
        dialog = ModifyDialog(self)
        dialog.exec()


    def modify_time(self):
        'Modifies the last recorded time in the database'
        modification = self.sender().text()
        last_index = self.table_previous_times.rowCount() - 1
        # print(f'last_index: {last_index}')
        # print(f'all solves: {self.all_solves}')

        if last_index >= 0:
            if modification == '+2':
                self.cursor.execute('UPDATE solves SET Time = Time + 2 WHERE id = ?',
                                    (self.table_previous_times.item(last_index, 0).text(),))
                self.db_connection.commit()
                self.all_solves[last_index] = round(self.all_solves[last_index] + 2, 3)
            elif modification == 'DNF':
                self.cursor.execute('UPDATE solves SET Time = "DNF" WHERE id = ?',
                                    (self.table_previous_times.item(last_index, 0).text(),))
                self.db_connection.commit()
                self.all_solves[last_index] = 'DNF'
            elif modification == 'Remove':
                self.cursor.execute('DELETE FROM solves WHERE id = ?',
                                    (self.table_previous_times.item(last_index, 0).text(),))
                self.db_connection.commit()
                self.all_solves.pop(last_index)
                self.solves_count -= 1
                self.table_previous_times.removeRow(last_index)
            self.statusBar().showMessage('Solve modified')
        else:
            self.statusBar().showMessage('No solves yet')

        self.load_saved_solves()


    def options_dialog(self):
        'Opens a dialog to modify the options'
        dialog = OptionsDialog(self)
        dialog.exec()




if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())