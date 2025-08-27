from processor_regex import classify_with_regex
from processor_bert import classify_with_bert
from processor_llm import classify_with_LLM
import pandas as pd

# Creating a function to classify a single log message or a DataFrame row:
def classify_log(row_or_source, log_message=None):
    # Support both (row) and (source, log_message) signatures
    if isinstance(row_or_source, pd.Series):
        source = row_or_source["source"]
        log_message = row_or_source["log_message"]
    else:
        source = row_or_source

    # If the source is the LegacyCRM:
    if source == "LegacyCRM":
        label = classify_with_LLM(log_message)
        return label
    else:
        label = classify_with_regex(log_message)
        if label is None:
            label = classify_with_bert(log_message)
        return label

# A function to classify the logs (list of tuples):
def classify(logs):
    labels = []
    for source, log_message in logs:
        label = classify_log(source, log_message)
        labels.append(label)
    return labels

# Defining a function to accept a csv of (source,log_message) and return another Csv with (source,log_message,classified_label):
def classify_csv(input_file_path):
    df = pd.read_csv(input_file_path)
    df["target_label"] = df.apply(classify_log, axis=1)
    output_file_path = "resources/output.csv"
    df.to_csv(output_file_path, index=False)

if __name__ == '__main__':
    classify_csv("resources/test.csv")
    logs = [
        ("ModernCRM", "IP 192.168.133.114 blocked due to potential attack"),
        ("BillingSystem", "User User12345 logged in."),
        ("AnalyticsEngine", "File data_6957.csv uploaded successfully by user User265."),
        ("AnalyticsEngine", "Backup completed successfully."),
        ("ModernHR", "GET /v2/54fadb412c4e40cdbaed9335e4c35a9e/servers/detail HTTP/1.1 RCODE  200 len: 1583 time: 0.1878400"),
        ("ModernHR", "Admin access escalation detected for user 9429"),
        ("LegacyCRM", "Case escalation for ticket ID 7324 failed because the assigned support agent is no longer active."),
        ("LegacyCRM", "Invoice generation process aborted for order ID 8910 due to invalid tax calculation module."),
        ("LegacyCRM", "The 'BulkEmailSender' feature is no longer supported. Use 'EmailCampaignManager' for improved functionality."),
        ("LegacyCRM", " The 'ReportGenerator' module will be retired in version 4.0. Please migrate to the 'AdvancedAnalyticsSuite' by Dec 2025")
    ]
    labels = classify(logs)
    for log, label in zip(logs, labels):
        print(log[0], "->", label)
    # Perform the classification: Adding a new pandas column as target labels:
    df["target_label"] = classify(list(zip(df["source"], df["log_message"])))

    # Creating a variable to keep the track of output file path:
    output_file_path = "resources/output.csv"

    # Converting the output file to csv file:
    df.to_csv(output_file_path, index=False)



    
if __name__ == '__main__':

    classify_csv("resources/test.csv")

    logs = [
        ("ModernCRM", "IP 192.168.133.114 blocked due to potential attack"),
        ("BillingSystem", "User User12345 logged in."),
        ("AnalyticsEngine", "File data_6957.csv uploaded successfully by user User265."),
        ("AnalyticsEngine", "Backup completed successfully."),
        ("ModernHR", "GET /v2/54fadb412c4e40cdbaed9335e4c35a9e/servers/detail HTTP/1.1 RCODE  200 len: 1583 time: 0.1878400"),
        ("ModernHR", "Admin access escalation detected for user 9429"),
        ("LegacyCRM", "Case escalation for ticket ID 7324 failed because the assigned support agent is no longer active."),
        ("LegacyCRM", "Invoice generation process aborted for order ID 8910 due to invalid tax calculation module."),
        ("LegacyCRM", "The 'BulkEmailSender' feature is no longer supported. Use 'EmailCampaignManager' for improved functionality."),
        ("LegacyCRM", " The 'ReportGenerator' module will be retired in version 4.0. Please migrate to the 'AdvancedAnalyticsSuite' by Dec 2025")
    ]
    labels = classify(logs)
        
    for log, label in zip(logs, labels):
        print(log[0], "->", label)

