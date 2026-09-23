"""Prompt wiring tests; mocked Gemini, no private data or paid API calls."""
import json
import unittest
from unittest.mock import patch, MagicMock
from local_server import Handler


class IncomeDescriptionTest(unittest.TestCase):
    def test_profession_rules_and_customer_input_reach_ai(self):
        examples = [
            ('ব্যবসায়ী', 'আমার দোকানের নাম পরীক্ষামূলক স্টোর। ঠিকানা পরীক্ষামূলক বাজার।'),
            ('কৃষক', 'আমি সবজি চাষ করি।'),
            ('চাকরিজীবী', 'আমি সেলসম্যান। আমার কর্মচারী পরিচয়পত্র নেই।'),
            ('প্রবাসী', 'আমি দুবাইয়ে কাজ করি।'),
            ('গৃহিণী', 'আমার স্বামী চার বছর ধরে দুবাইয়ে চাকরি করেন। সংসারের জন্য মাসে ৪০,০০০ টাকা পাঠান।'),
        ]
        for profession, raw in examples:
            with self.subTest(profession=profession):
                handler = MagicMock()
                handler.body.return_value = {'apiKey':'test-only','text':raw,'name':'পরীক্ষামূলক নাম','profession':profession}
                response = MagicMock()
                response.__enter__.return_value.read.return_value = json.dumps({'candidates':[{'content':{'parts':[{'text':'পরীক্ষামূলক ফলাফল'}]}}]}).encode()
                with patch('local_server.urllib.request.urlopen',return_value=response) as call:
                    Handler.gemini_description(handler)
                request=call.call_args.args[0]
                payload=json.loads(request.data)
                prompt=payload['contents'][0]['parts'][0]['text']
                self.assertIn(raw,prompt)
                self.assertIn('আমার ব্যবসাপ্রতিষ্ঠানের ঠিকানা',prompt)
                self.assertIn('কৃষক: declaration-এর বর্ণনায় কোনো ঠিকানা লিখবেন না',prompt)
                self.assertIn('প্রবাসী: প্রতিষ্ঠানের নাম ও কর্মস্থলের ঠিকানা লিখবেন না',prompt)
                self.assertIn('আমার কর্মস্থলের ঠিকানা',prompt)
                self.assertIn('পাঠানো অর্থকে গৃহিণীর নিজের চাকরির বেতন বলবেন না',prompt)
                self.assertIn('কোনো নতুন নাম',prompt)
                handler.reply.assert_called_once_with(200,{'text':'পরীক্ষামূলক ফলাফল'})

    def test_blank_description_does_not_call_ai(self):
        handler=MagicMock();handler.body.return_value={'apiKey':'test-only','text':' '}
        with patch('local_server.urllib.request.urlopen') as call:
            Handler.gemini_description(handler)
        call.assert_not_called()
        self.assertIn('error',handler.reply.call_args.args[1])
